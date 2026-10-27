"""Scheduled file-server uploader. Does not change or move source PDFs.

python sync-kitchen-abs.py --config /private/ab-sync.json
Requires extract-ab-specifications.py alongside this script and PyMuPDF.
"""

import argparse
import base64
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import socket
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
import zipfile


MAX_PDF_BYTES = 20 * 1024 * 1024
MAX_ARCHIVE_BYTES = 512 * 1024 * 1024
PARSER_VERSION = 1


def extractor():
    module_spec = importlib.util.spec_from_file_location("ab_extractor", Path(__file__).with_name("extract-ab-specifications.py"))
    module = importlib.util.module_from_spec(module_spec)
    module_spec.loader.exec_module(module)
    return module


def stable_sources(folder, now=None, minimum_age=30):
    """A changing copy is retried on the next scheduled run; ZIP paths stay in memory."""
    now = time.time() if now is None else now
    sources, errors, deferred = {}, [], []
    if not folder.is_dir():
        raise ValueError("AB source folder is unavailable.")

    def add(name, data, location):
        if len(data) > MAX_PDF_BYTES:
            raise ValueError("PDF exceeds 20 MB")
        digest = hashlib.sha256(data).hexdigest()
        if digest in sources:
            sources[digest]["locations"].append(location)
        else:
            sources[digest] = {"name": Path(name.replace("\\", "/")).name, "data": data, "locations": [location]}

    for file in sorted(folder.rglob("*")):
        if file.suffix.lower() not in (".pdf", ".zip") or not file.is_file() or file.is_symlink():
            continue
        location = file.relative_to(folder).as_posix()
        try:
            before = file.stat()
            if now - before.st_mtime < minimum_age:
                deferred.append(location)
                continue
            additions = []
            if file.suffix.lower() == ".pdf":
                if before.st_size > MAX_PDF_BYTES:
                    raise ValueError("PDF exceeds 20 MB")
                additions.append((file.name, file.read_bytes(), location))
            else:
                with zipfile.ZipFile(file) as archive:
                    entries = [entry for entry in archive.infolist() if not entry.is_dir()
                               and entry.filename.lower().endswith(".pdf") and not entry.filename.startswith("__MACOSX/")]
                    if len(entries) > 5000 or sum(entry.file_size for entry in entries) > MAX_ARCHIVE_BYTES:
                        raise ValueError("ZIP exceeds import limits")
                    for entry in entries:
                        if entry.file_size > MAX_PDF_BYTES:
                            raise ValueError("PDF in ZIP exceeds 20 MB")
                        additions.append((entry.filename, archive.read(entry), location + "::" + entry.filename))
            after = file.stat()
            if (before.st_size, before.st_mtime_ns) != (after.st_size, after.st_mtime_ns):
                deferred.append(location)
                continue
            for name, data, origin in additions:
                add(name, data, origin)
        except (OSError, ValueError, zipfile.BadZipFile, RuntimeError) as error:
            errors.append({"source": location, "error": str(error)[:500]})
    return sources, errors, deferred


def load_state(file):
    if not file.exists():
        return {"documents": {}}
    state = json.loads(file.read_text(encoding="utf-8-sig"))
    if not isinstance(state.get("documents"), dict):
        raise ValueError("Invalid AB sync state; restore or move it before retrying.")
    return state


def write_state(file, state):
    file.parent.mkdir(parents=True, exist_ok=True)
    temporary = file.with_suffix(file.suffix + ".tmp")
    temporary.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, file)


def post_json(endpoint, token, payload, attempts=3):
    encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    for attempt in range(attempts):
        try:
            request = urllib.request.Request(endpoint, data=encoded,
                headers={"Content-Type": "application/json", "Authorization": "Bearer " + token}, method="POST")
            # Redirects must never forward the upload credential to another destination.
            class NoRedirect(urllib.request.HTTPRedirectHandler):
                def redirect_request(self, request, fp, code, msg, headers, newurl):
                    return None
            with urllib.request.build_opener(NoRedirect()).open(request, timeout=60) as response:
                return json.loads(response.read())
        except urllib.error.HTTPError as error:
            if error.code < 500 or attempt + 1 == attempts:
                raise ValueError(f"AB API returned HTTP {error.code}") from None
        except (urllib.error.URLError, TimeoutError):
            if attempt + 1 == attempts:
                raise ValueError("AB API connection failed") from None
        time.sleep(2 ** attempt)


def synchronize(config, state_path, send=post_json):
    endpoint = config["endpoint"]
    destination = urllib.parse.urlsplit(endpoint)
    if destination.path != "/api/internal/ab-sync" or destination.query or destination.fragment or destination.username:
        raise ValueError("Use the exact /api/internal/ab-sync endpoint without query parameters.")
    if destination.scheme != "https" and not (destination.scheme == "http" and destination.hostname in ("localhost", "127.0.0.1")):
        raise ValueError("AB sync requires HTTPS (except localhost testing).")
    token = config.get("token", "")
    if len(token) < 32:
        raise ValueError("A dedicated AB sync token of at least 32 characters is required.")
    state = load_state(state_path)
    # A new destination must receive its own imports, even if the same folder was synced elsewhere.
    if state.get("endpoint") != endpoint:
        state = {"endpoint": endpoint, "documents": {}}
    run_id = str(uuid.uuid4())
    send(endpoint, token, {"operation": "start", "runId": run_id, "source": config.get("sourceName", socket.gethostname())})
    summary = {"scanned": 0, "uploaded": 0, "skipped": 0, "errors": 0, "review": 0, "deferred": 0, "issues": []}
    try:
        sources, errors, deferred = stable_sources(Path(config["source"]))
        summary.update(scanned=len(sources), deferred=len(deferred), errors=len(errors), issues=errors[:50])
        parser = extractor()
        parsed, by_slug = {}, {}
        for digest, source in sources.items():
            previous = state["documents"].get(digest)
            if previous and previous.get("parserVersion") == PARSER_VERSION:
                slug = previous["kitchenSlug"]
            else:
                try:
                    document = parser.extract(Path(source["name"]), data=source["data"])
                    document["sourceLocations"] = source["locations"]
                    parsed[digest] = document
                    slug = document["kitchenSlug"]
                except Exception as error:
                    summary["errors"] += 1
                    if len(summary["issues"]) < 50:
                        summary["issues"].append({"source": source["locations"][0], "error": str(error)[:500]})
                    continue
            by_slug.setdefault(slug, []).append(digest)
        for slug, hashes in by_slug.items():
            for digest in hashes:
                if digest not in parsed:
                    summary["skipped"] += 1
                    continue
                try:
                    result = send(endpoint, token, {"operation": "document", "document": parsed[digest],
                        "pdfBase64": base64.b64encode(sources[digest]["data"]).decode("ascii"),
                        "holdForReview": len(hashes) > 1})
                    if result.get("status") not in ("ACTIVE", "REVIEW"):
                        raise ValueError("Unexpected AB API response")
                    state["documents"][digest] = {"kitchenSlug": slug, "parserVersion": PARSER_VERSION, "status": result["status"]}
                    write_state(state_path, state)
                    summary["uploaded"] += 1
                    summary["review"] += int(result["status"] == "REVIEW")
                except Exception as error:
                    summary["errors"] += 1
                    if len(summary["issues"]) < 50:
                        summary["issues"].append({"source": sources[digest]["locations"][0], "error": str(error)[:500]})
    except Exception as error:
        summary["errors"] += 1
        summary["issues"].append({"source": "scan", "error": str(error)[:500]})
    send(endpoint, token, {"operation": "finish", "runId": run_id, "summary": summary})
    return summary


def main():
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument("--config", required=True, type=Path)
    options = args.parse_args()
    config = json.loads(options.config.read_text(encoding="utf-8-sig"))
    state_path = Path(config.get("stateFile", str(options.config.with_suffix(".state.json"))))
    lock_path = state_path.with_suffix(".lock")
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    # OS locks are released on process death, including server restarts.
    lock_file = lock_path.open("a+b")
    try:
        if os.name == "nt":
            import msvcrt
            lock_file.seek(0)
            if not lock_file.read(1):
                lock_file.write(b"0"); lock_file.flush()
            lock_file.seek(0)
            msvcrt.locking(lock_file.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        summary = synchronize(config, state_path)
        print(json.dumps({"finishedAt": datetime.now(timezone.utc).isoformat(), **summary}, ensure_ascii=False))
        return 1 if summary["errors"] else 0
    finally:
        lock_file.close()


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        print("AB synchronization failed: " + str(error), file=sys.stderr)
        sys.exit(1)
