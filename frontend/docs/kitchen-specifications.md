# Order kitchen specifications

Live and PX order detail pages show **Kitchen specifications / Küchendaten**.
Every order shows its selected items, article snapshots and identified manufacturers.
Kitchens with a matching AB also show the original header, finish specifications,
position list and authenticated PDF viewing/download links.

The original AB describes the base kitchen. Customer selections are shown in the
separate Ordered items tab. Missing manufacturers are displayed as Not specified;
current product metadata is used only when its article number matches the ordered
article. ABs are matched by the exact kitchen identity: `ab-105806` and the
legacy numeric slug `105806` identify the same AB. The dashboard creates grouped
slugs such as `105-806` when the kitchen code is entered as `105 806`; that exact
format and `ab-105-806` also resolve to the same six-digit identity. The kitchen
code entered when creating a kitchen must be the real six-digit AB/kitchen
number. Contract numbers, partial
codes and module/layout variants are never used to guess a document.

## Automatic file-server imports

The production agent reads
`Z:\10_ZHVILLIM\05_CLIENTS\04_FRG\03_DOKUMENTET EXTERNE\01_HAUS\ABs`
on the file server. Scheduled checks run daily at **12:00 and 15:30** in
Central European local time, including daylight saving. See
[the agent installation and operations guide](../../deploy/ab-sync/README.md).

First valid documents become available automatically on the matching kitchen
and its order pages. Different versions of an existing AB wait for review in
**Admin > AB imports**. This page also shows recent runs, errors, source files,
PDF previews and documents waiting for a kitchen to be created. Choosing
**Use this version** publishes that version and records the reviewing admin.
Previously imported versions remain available in the imports page.

Documents are sorted by their last successful import/read, newest first. The
**Last read** column shows the date and time in Europe/Budapest (Central European
time including DST). A repeated upload of an identical PDF updates this time
without creating a new version; unchanged scanner checkpoints do not update it.
Deployment baseline seeds do not change read times. Earlier read times that were
not recorded are shown as **Not recorded**, without guessing from the PDF date.
This requires `20261015190000_add_kitchen_ab_last_read_at` before using the updated
app. Metadata, initial import timestamps and active publications stay unchanged.

The three `KitchenAb*` database tables store metadata, disk file keys,
publication pointers and scan results. The PDF files themselves are stored in
the private persistent directory `/var/lib/fragmento/ab-pdfs` on the existing
application server, outside its Git checkout. This uses the server's disk and
does not require an Object Storage subscription. Configure the absolute
`AB_PDF_DIRECTORY` in production; local development defaults to the ignored
`frontend/.local-data/ab-pdfs` folder. Back up the PDF directory as well as the
database. A database backup alone no longer includes the PDFs.

The dedicated token-authenticated
`/api/internal/ab-sync` endpoint accepts imports from the server agent. It
cannot activate a replacement version or modify an order or catalog record.
The application reads active database versions first, with the packaged
manifest as a compatibility fallback. `npm run seed:ab-documents` initializes
the 140 packaged document records and their disk files without replacing active
versions. File names are SHA-256 hashes; identical uploads share one file,
changed versions are separate files, and downloads verify the stored hash.
Files are outside `public`, readable by the service owner, and published only
after an atomic complete write.

## Migrate existing database PDFs to disk

Apply `20261015180000_store_kitchen_ab_pdfs_on_disk`. Run
`npm run migrate:ab-pdfs` to copy and verify all existing database PDF bytes.
This first phase retains the database copies for compatibility with an old
running app. Deploy the disk-aware application, verify authenticated downloads,
then run `npm run migrate:ab-pdfs -- --release-db-bytes` to clear the legacy
database byte fields. The script verifies each disk copy before clearing its
database copy and never changes document metadata or publication choices.
Retrying either phase is safe. A missing or corrupt file prevents its database
copy from being cleared. Keep a pre-migration backup for rollback.

## Rebuild the packaged baseline manually

1. Put PDFs or ZIP archives in the repository's `ABs` folder. Subfolders and
   PDFs inside ZIPs are scanned automatically. Supported names include
   `AB 104968 - WHG 1.0.001.PDF`, `AB 105759-56.PDF`, `AB 109873.pdf`, and
   `AB_BD105672-3.pdf`. The six-digit filename number must agree with the
   order number printed inside the PDF. Apartment numbers are taken only
   from an explicit WHG filename label.
2. From `frontend`, run `npm run extract:ab-specifications` with Python and
   PyMuPDF installed.
3. Review `data/kitchen-specifications/index.json` against the source PDF.
   The extractor preserves the manufacturer's text as printed, including
   supplier labels such as Archi-AM, and keeps left/right handing separate
   from the article number. It rejects conflicting AB numbers, incomplete
   extraction and conflicting document versions for one kitchen. Byte-identical
   copies are deduplicated, with all source locations kept in the manifest.
4. Include the generated JSON and private PDF copies under
   `data/kitchen-specifications/pdfs` in the application change, then build
   and deploy through the normal release workflow.

The current extraction supports the architecto AB table layout in the supplied
140 documents, including coded and uncoded headers, SAGA kitchens and the
DIVERSE kitchen with alphabetic positions such as `2a`. Missing header codes
and apartment numbers are left empty. Review extraction when adding a PDF
from a different supplier or layout.

PDFs are kept outside `public` and served only through the authenticated
`/api/admin/kitchen-specifications/<slug>/pdf` route. Next's file tracing includes
the private PDF files in the deployed server bundle. This feature requires no
database migration for the packaged baseline. Automatic imports require the
`20261015160000_add_kitchen_ab_sync` migration.

## Verification

Run `node --test test/order-kitchen-specifications.test.js` from `frontend`.
Run `python -m unittest discover -s test -p test_ab_specifications.py` for the importer.
The tests cover all source PDF hashes, AB identity, snapshot precedence,
manufacturer matching, ZIP/nested source discovery, conflicting versions,
header variants and the fallback for kitchens without an AB.
