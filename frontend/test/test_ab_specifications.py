import importlib.util
from pathlib import Path
import tempfile
import unittest
import zipfile


ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("ab_specifications", ROOT / "frontend/scripts/extract-ab-specifications.py")
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


def archived_pdf(archive, filename):
    packaged = ROOT / "frontend/data/kitchen-specifications/pdfs" / filename
    if packaged.exists():
        return packaged.read_bytes()
    with zipfile.ZipFile(ROOT / "ABs" / archive) as source:
        return source.read(filename)


class AbSpecificationTests(unittest.TestCase):
    def test_original_finish_specifications_do_not_include_delivery_header_fields(self):
        result = importer.extract(ROOT / "ABs/AB 104968 - WHG 1.0.001.PDF")
        self.assertEqual(len(result["specifications"]), 22)
        self.assertFalse(any(field["label"] == "Lieferadresse" for field in result["specifications"]))
        self.assertTrue(any(field["label"] == "Lieferadresse" for field in result["header"]))

    def test_nested_pdfs_and_zip_entries_are_deduplicated_by_content(self):
        data = archived_pdf("HAUS 1.zip", "AB 104968 - WHG 1.0.001.PDF")
        with tempfile.TemporaryDirectory() as temporary:
            source = Path(temporary)
            (source / "nested").mkdir()
            (source / "nested/AB 104968 - WHG 1.0.001.PDF").write_bytes(data)
            with zipfile.ZipFile(source / "house.zip", "w") as archive:
                archive.writestr("inner/AB 104968 - WHG 1.0.001.PDF", data)
            sources = importer.read_sources(source)
            self.assertEqual(len(sources), 1)
            self.assertEqual(len(sources[0].locations), 2)
            self.assertEqual(importer.prepare_documents(sources)[0][1]["kitchenSlug"], "ab-104968")

    def test_short_filename_uses_confirmed_document_number_without_inventing_an_apartment(self):
        data = archived_pdf("Haus 3.zip", "AB 105759-56.PDF")
        result = importer.extract(Path("AB 105759-56.PDF"), data=data)
        self.assertEqual(result["abNumber"], "670 105759")
        self.assertEqual(result["apartment"], "")
        self.assertTrue(result["articles"])

    def test_valid_header_with_fewer_fields_does_not_invent_missing_panel_settings(self):
        data = archived_pdf("Haus 3.zip", "AB 105769-62.PDF")
        result = importer.extract(Path("AB 105769-62.PDF"), data=data)
        self.assertEqual(len(result["specifications"]), 19)
        self.assertFalse(any(field["label"] == "Ausführung Wangen" for field in result["specifications"]))

    def test_uncoded_header_preserves_values_without_inventing_codes(self):
        data = archived_pdf("Haus 6.zip", "AB 105805 - WHG 79.PDF")
        result = importer.extract(Path("AB 105805 - WHG 79.PDF"), data=data)
        program = next(field for field in result["specifications"] if field["label"] == "Programm")
        self.assertEqual(program, {"label": "Programm", "code": "", "value": "IP 2200"})
        self.assertGreaterEqual(len(result["specifications"]), 20)
        self.assertEqual(result["apartment"], "79")
        self.assertTrue(any(field["label"] == "Lieferadresse" for field in result["header"]))
        self.assertTrue(result["articles"])

    def test_alphabetic_positions_are_kept_in_the_diverse_kitchen(self):
        result = importer.extract(ROOT / "frontend/data/kitchen-specifications/pdfs/AB_BD105672-3.pdf")
        self.assertEqual(result["abNumber"], "670 105672")
        self.assertTrue(any(item["position"] == "2a" and item["articleNumber"] == "MP-298" for item in result["articles"]))
        self.assertTrue(any(item["manufacturer"] == "Archi-BU" for item in result["articles"]))

    def test_filename_must_agree_with_the_number_inside_the_pdf(self):
        data = archived_pdf("Haus 4.zip", "AB 105777 - WHG 4.0.049.PDF")
        with self.assertRaisesRegex(ValueError, "disagree"):
            importer.extract(Path("AB 105803 - WHG 5.4.073.PDF"), data=data)

    def test_distinct_documents_for_one_kitchen_are_rejected(self):
        data = archived_pdf("HAUS 1.zip", "AB 104968 - WHG 1.0.001.PDF")
        with tempfile.TemporaryDirectory() as temporary:
            source = Path(temporary)
            (source / "nested").mkdir()
            filename = "AB 104968 - WHG 1.0.001.PDF"
            (source / filename).write_bytes(data)
            (source / "nested" / filename).write_bytes(data + b"\n% another source revision\n")
            with self.assertRaisesRegex(ValueError, "Conflicting"):
                importer.prepare_documents(importer.read_sources(source))


if __name__ == "__main__":
    unittest.main()
