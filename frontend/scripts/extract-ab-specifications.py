"""Extract dashboard reference data from architecto AB PDFs (requires PyMuPDF).

Run from the repository root: python frontend/scripts/extract-ab-specifications.py
The originals stay in ABs; private copies and JSON are packaged with the app.
"""

import argparse
import hashlib
import json
from pathlib import Path
import re
from types import SimpleNamespace
import zipfile

import fitz


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "frontend/data/kitchen-specifications"


def lines(page):
    return sorted([
        {"x": line["bbox"][0], "y": line["bbox"][1],
         "text": " ".join(span["text"] for span in line["spans"]).strip()}
        for block in page.get_text("dict")["blocks"] if "lines" in block
        for line in block["lines"]
    ], key=lambda line: (round(line["y"], 1), line["x"]))


def same_row(entries, y):
    return [line for line in entries if abs(line["y"] - y) < 1]


POSITION = re.compile(r"\d+[a-z]?(?:\.\d+[a-z]?)*", re.I)


def read_sources(folder):
    """Read nested PDFs and ZIP members without extracting archive paths to disk."""
    unique = {}

    def add(name, data, location):
        digest = hashlib.sha256(data).hexdigest()
        if digest in unique:
            unique[digest].locations.append(location)
        else:
            unique[digest] = SimpleNamespace(name=Path(name.replace("\\", "/")).name,
                                             data=data, locations=[location])

    files = sorted(path for path in folder.rglob("*") if path.is_file())
    for file in files:
        if file.suffix.lower() == ".pdf":
            add(file.name, file.read_bytes(), file.relative_to(folder).as_posix())
    for file in files:
        if file.suffix.lower() == ".zip":
            with zipfile.ZipFile(file) as archive:
                for entry in sorted(archive.infolist(), key=lambda item: item.filename):
                    if not entry.is_dir() and entry.filename.lower().endswith(".pdf") and not entry.filename.startswith("__MACOSX/"):
                        add(entry.filename, archive.read(entry),
                            file.relative_to(folder).as_posix() + "::" + entry.filename)
    if not unique:
        raise ValueError("No AB PDFs found")
    return list(unique.values())


def prepare_documents(sources):
    prepared = {}
    for source in sources:
        document = extract(Path(source.name), data=source.data)
        slug = document["kitchenSlug"]
        if slug in prepared:
            raise ValueError(f"Conflicting AB documents for {slug}: {prepared[slug][0].locations} and {source.locations}")
        document["sourceLocations"] = source.locations
        prepared[slug] = (source, document)
    return [prepared[slug] for slug in sorted(prepared)]


def extract(source, data=None):
    match = re.match(r"AB[\s_]*(?:BD)?(\d{6})\b", source.name, re.I)
    if not match:
        raise ValueError(f"Unsupported AB filename: {source.name}")
    number = match.group(1)
    apartment_match = re.search(r"\bWHG\s*([\d.]+)", source.name, re.I)
    apartment = apartment_match.group(1).rstrip(".") if apartment_match else ""
    data = source.read_bytes() if data is None else data
    document = fitz.open(stream=data, filetype="pdf")
    first_text = document[0].get_text()
    number_match = re.search(r"Auftrags-Nr\.\s*([\d ]+)", first_text)
    if not number_match:
        raise ValueError(f"AB document number is missing: {source.name}")
    document_number = number_match.group(1).strip()
    if document_number.replace(" ", "") != "670" + number:
        raise ValueError(f"Filename and document number disagree: {source.name}")
    date = re.search(r"Datum (\d{2}\.\d{2}\.\d{4})", first_text).group(1)
    specifications = []
    header = []
    articles = []

    specifications_finished = False
    for page_index, page in enumerate(document):
        entries = lines(page)
        table_headers = [line for line in entries if line["text"] == "Pos"
                         and any(row["text"] == "Menge" for row in same_row(entries, line["y"]))]
        table_top = table_headers[0]["y"] if table_headers else None

        if not specifications_finished:
            specifications_start = next((line["y"] for line in entries if line["text"] == "Programm"), page.rect.height)
            for line in entries:
                if line["x"] < 100 and line["y"] >= specifications_start - 1 and (table_top is None or line["y"] < table_top):
                    row = same_row(entries, line["y"])
                    codes = [entry["text"].lstrip(": ") for entry in row if 245 < entry["x"] < 285 and entry["text"].startswith(":")]
                    values = [entry["text"] for entry in row if 285 <= entry["x"] < 500]
                    if codes and (any(codes) or values):
                        field = {"label": line["text"], "code": " ".join(codes) if values else "",
                                 "value": " ".join(values or codes)}
                        if not any(field["label"] == item["label"] for item in specifications):
                            specifications.append(field)

        if page_index == 0:
            active = None
            header_start = next(line["y"] for line in entries if line["text"].startswith("Kundennr."))
            header_end = min((line["y"] for line in entries if re.match(r"wir\s+danken", line["text"])), default=header_start)
            for line in entries:
                if not (header_start - 1 <= line["y"] < header_end):
                    continue
                if line["x"] < 100:
                    row = same_row(entries, line["y"])
                    label, _, inline_value = line["text"].partition(":")
                    values = [entry["text"].lstrip(": ") for entry in row if 170 <= entry["x"] < 500]
                    if values or inline_value:
                        active = {"label": label.strip(), "value": inline_value.strip() or " ".join(values)}
                        header.append(active)
                elif active and line["x"] >= 170 and not any(entry["x"] < 100 for entry in same_row(entries, line["y"])):
                    active["value"] += "\n" + line["text"].lstrip(": ")

        if table_top is None:
            continue
        specifications_finished = True
        body = [line for line in entries if line["y"] > table_top + 2]
        positions = [line for line in body if line["x"] < 85 and POSITION.fullmatch(line["text"])]
        # Legal text below the item table starts in the position column.
        stops = [line["y"] for line in body if line["x"] < 85
                 and not POSITION.fullmatch(line["text"])]
        end = min(stops, default=page.rect.height)
        positions = [line for line in positions if line["y"] < end]
        if articles:
            continuation_end = positions[0]["y"] if positions else end
            continued = [line["text"] for line in body if line["x"] >= 330 and line["y"] < continuation_end - 1]
            if continued:
                articles[-1]["description"] += "\n" + "\n".join(continued)
        for index, position in enumerate(positions):
            top = position["y"]
            bottom = positions[index + 1]["y"] if index + 1 < len(positions) else end
            row = same_row(body, top)
            section = [line for line in body if top - 1 <= line["y"] < bottom - 1]
            quantity = next((line["text"] for line in row if 100 <= line["x"] < 175), None)
            code = " ".join(line["text"] for line in row if 175 <= line["x"] < 275)
            handing = " ".join(line["text"] for line in row if 275 <= line["x"] < 330)
            manufacturer = " ".join(line["text"] for line in section if 175 <= line["x"] < 275 and line["y"] > top + 2)
            name = " ".join(line["text"] for line in row if line["x"] >= 330)
            description = "\n".join(line["text"] for line in section if line["x"] >= 330 and line["y"] > top + 2)
            articles.append({"position": position["text"], "quantity": float(quantity) if quantity else None,
                             "articleNumber": code, "manufacturer": manufacturer,
                             "handing": handing, "name": name, "description": description, "page": page_index + 1})

    labels = {field["label"] for field in specifications}
    has_core_header = ("Programm" in labels and "Korpusausführung" in labels
                       and any(label.startswith("Arbeitsplatten") for label in labels))
    if not has_core_header or not articles or any(not item["articleNumber"] or not item["name"] for item in articles):
        raise ValueError(f"Incomplete extraction: {source.name}")
    result = {"kitchenSlug": "ab-" + number, "abNumber": document_number, "apartment": apartment,
              "date": date, "sourceFile": source.name, "sourceSha256": hashlib.sha256(data).hexdigest(),
              "pageCount": len(document), "header": header, "specifications": specifications, "articles": articles}
    document.close()
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=ROOT / "ABs")
    args = parser.parse_args()
    # Validate the entire batch before replacing generated app data.
    prepared = prepare_documents(read_sources(args.source))
    documents = [document for _, document in prepared]
    (OUTPUT / "pdfs").mkdir(parents=True, exist_ok=True)
    for source, document in prepared:
        (OUTPUT / "pdfs" / document["sourceFile"]).write_bytes(source.data)
    (OUTPUT / "index.json").write_text(json.dumps({item["kitchenSlug"]: item for item in documents},
                                                ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for item in documents:
        print(f'{item["kitchenSlug"]}: {len(item["specifications"])} specifications, {len(item["articles"])} articles')


if __name__ == "__main__":
    main()
