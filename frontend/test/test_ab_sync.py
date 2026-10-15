import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import time
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("ab_sync", ROOT / "frontend/scripts/sync-kitchen-abs.py")
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)
PDF = ROOT / "frontend/data/kitchen-specifications/pdfs/AB 105777 - WHG 4.0.049.PDF"


class AbSyncTests(unittest.TestCase):
    def test_partial_copy_is_deferred_and_broken_zip_does_not_block_good_pdfs(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            shutil.copyfile(PDF, folder / PDF.name)
            (folder / "broken.zip").write_bytes(b"broken")
            sources, errors, deferred = sync.stable_sources(folder, now=time.time() + 100)
            self.assertEqual(len(sources), 1)
            self.assertEqual(len(errors), 1)
            self.assertEqual(deferred, [])
            sources, _, deferred = sync.stable_sources(folder, now=time.time())
            self.assertEqual(sources, {})
            self.assertIn(PDF.name, deferred)

    def test_success_is_checkpointed_and_failed_upload_is_retried_next_run(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            shutil.copyfile(PDF, folder / PDF.name)
            import os
            os.utime(folder / PDF.name, (0, 0))
            state = folder / "state.json"
            config = {"endpoint": "http://localhost/api/internal/ab-sync", "token": "x" * 48, "source": directory}
            requests = []

            def fail_upload(endpoint, token, payload):
                requests.append(payload)
                if payload["operation"] == "document":
                    raise ValueError("offline")
                return {}

            result = sync.synchronize(config, state, send=fail_upload)
            self.assertEqual(result["errors"], 1)
            self.assertFalse(state.exists())

            def accept_upload(endpoint, token, payload):
                requests.append(payload)
                return {"status": "ACTIVE"} if payload["operation"] == "document" else {}

            self.assertEqual(sync.synchronize(config, state, send=accept_upload)["uploaded"], 1)
            self.assertEqual(sync.synchronize(config, state, send=accept_upload)["skipped"], 1)
            self.assertEqual(len([item for item in requests if item["operation"] == "document"]), 2)
            self.assertEqual(len(json.loads(state.read_text())["documents"]), 1)

    def test_versions_for_same_identity_are_both_held_for_review(self):
        with tempfile.TemporaryDirectory() as directory:
            import os
            folder = Path(directory)
            (folder / "revision").mkdir()
            for location, data in [(folder / PDF.name, PDF.read_bytes()),
                                   (folder / "revision" / PDF.name, PDF.read_bytes() + b"\n% revision\n")]:
                location.write_bytes(data)
                os.utime(location, (0, 0))
            uploads = []

            def accept(endpoint, token, payload):
                if payload["operation"] == "document":
                    uploads.append(payload)
                    return {"status": "REVIEW"}
                return {}

            result = sync.synchronize({"endpoint": "http://localhost/api/internal/ab-sync", "token": "x" * 48,
                "source": directory}, folder / "state.json", send=accept)
            self.assertEqual(result["review"], 2)
            self.assertTrue(all(item["holdForReview"] for item in uploads))

    def test_plain_http_for_remote_server_is_rejected_before_any_upload(self):
        with self.assertRaisesRegex(ValueError, "HTTPS"):
            sync.synchronize({"endpoint": "http://example.com/api/internal/ab-sync"}, Path("not-written.json"))


if __name__ == "__main__":
    unittest.main()
