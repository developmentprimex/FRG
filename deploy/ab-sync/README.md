# File-server AB synchronization

## Installed arrangement

- User folder: `Z:\10_ZHVILLIM\05_CLIENTS\04_FRG\03_DOKUMENTET EXTERNE\01_HAUS\ABs`.
- SMB path: `\\192.168.10.8\files\10_ZHVILLIM\05_CLIENTS\04_FRG\03_DOKUMENTET EXTERNE\01_HAUS\ABs`.
- Local source on that server: `F:\FILES\10_ZHVILLIM\05_CLIENTS\04_FRG\03_DOKUMENTET EXTERNE\01_HAUS\ABs`.
- Scheduled task: `Fragmento-AB-Sync`, daily **12:00 and 15:30**, Central European local time with daylight saving.
- Agent: `C:\ProgramData\Fragmento\ab-sync`, running as Windows LOCAL SERVICE.
- Application endpoint: `https://fragmento.de/api/internal/ab-sync`.
- Private PDF directory on the existing application server: `/var/lib/fragmento/ab-pdfs`, configured by `AB_PDF_DIRECTORY`. No Object Storage subscription is used.
- Dashboard: `/admin/ab-imports`, visible to administrators with full access.

Add real AB PDFs or ZIPs to this folder, including subfolders. The agent reads
the folder without moving or deleting files. A new document appears under its
exact six-digit kitchen identity, independent of contract numbers. Documents
received before a kitchen exists remain available and are used when that exact
kitchen is created. Supported layouts and filename conventions are documented
in `frontend/docs/kitchen-specifications.md`.

When creating a kitchen, enter its actual six-digit AB/kitchen number in
**Kitchen code**, for example `105672` or `105 672`. The dashboard's generated
slugs `105672`, `105-672`, `ab-105672` and `ab-105-672` all identify the same AB.
Contract numbers, partial numbers and module/layout suffixes are never used to
guess a match. No second scan is needed after creating the matching kitchen:
the retained active AB is resolved when the kitchen/order page is loaded.

A first valid AB is published automatically. A different PDF for an existing AB
waits for review; the previous version stays active. If a scan contains several
different PDFs for a previously unseen AB, all wait for review. Identical PDF
copies are deduplicated by SHA-256. Malformed documents and unsupported layouts
are recorded as errors and retried next time. There is no OCR for scanned PDFs.

Files must be at least 30 seconds old and unchanged during reading. A file still
being copied is deferred to the next scheduled run. ZIP members are never
extracted to disk. Limits: 20 MiB per PDF, 5,000 ZIP entries and 512 MiB total
uncompressed content per ZIP. Changing a source filename does not duplicate it.

## First installation or moving to another server

1. Deploy the application routes and migrations using `prisma migrate deploy`.
   Configure `AB_PDF_DIRECTORY` to an absolute persistent path outside the Git
   checkout and outside `public`, owned by the application service user with
   directory mode 0700. Generate the Prisma client in the deployment environment
   and run `npm run seed:ab-documents` once. Repeating the seed is safe.
2. Generate a dedicated random token of at least 32 characters and configure
   `AB_SYNC_TOKEN` in the application's production environment. Restart the app.
   Give the same token to the agent using a private temporary file. Never commit
   the real token or agent configuration.
3. On the Windows file server, as administrator, use
   `prepare-windows-runtime.ps1 -ExistingPythonDirectory <existing-python-dir> -Source <local-AB-folder>`.
   It copies the existing official Python runtime to the private agent directory,
   installs the pinned PyMuPDF requirement, and grants LOCAL SERVICE read access
   to the nominated AB tree. The source must be a local path for this step.
4. Run `install-windows.ps1 -Source <SMB-or-local-AB-folder> -Endpoint https://fragmento.de/api/internal/ab-sync -TokenFile <private-token-file> -Python C:\ProgramData\Fragmento\ab-sync\python\python.exe`.
   Keep both Python scripts alongside the installer or in their repository paths.
   A share belonging to this server is resolved to its local disk path. Mapped
   drive letters belonging to an interactive user must not be used by the task.
5. Delete the temporary token file, then run
   `Start-ScheduledTask -TaskName Fragmento-AB-Sync`. Check dashboard results and
   `Get-ScheduledTaskInfo -TaskName Fragmento-AB-Sync` (successful result: 0).

The installer restricts the agent directory to SYSTEM, administrators and LOCAL
SERVICE. Configuration contains the secret; logs and dashboard do not. The
service needs outgoing HTTPS access to the application and read access to the
AB source, with no stored interactive user password. It works while users are
logged out. If a schedule is missed during a server outage, Windows starts it
when available. Concurrent runs are suppressed and execution is limited to two
hours. HTTPS redirects are rejected to protect the token.

## Operations

- `last-run.log` contains the latest summary. Dashboard shows the last 20 runs
  and up to 500 document versions, with issue details and PDF previews.
- The agent stores accepted hashes in `state.json` after each successful upload;
  transient network errors are retried and failed uploads are retried next run.
- Stop the task before changing config or resetting state. Deleting `state.json`
  forces a rescan; the application's hash deduplication prevents duplicates.
- Replacing `AB_SYNC_TOKEN` requires updating both the app and protected agent
  config. Stop the task while rotating it. Do not print tokens in diagnostics.
- Back up **both** `/var/lib/fragmento/ab-pdfs` and PostgreSQL. The database stores
  metadata, file keys, version choices and run history; it no longer holds the
  PDFs. Keep disk files and their database records consistent when restoring.
  Back up the source folder independently. Removing a source PDF does not remove
  an imported document. To pause imports, disable `Fragmento-AB-Sync` in Windows
  Task Scheduler. Existing ABs remain available.
- A RUNNING record older than three hours is shown as interrupted. If the API
  itself is unreachable, check the local log/task result; no new dashboard record
  can be written during that outage.

## Application deployment and rollback

Normal deployments run migrations, `seed:ab-documents`, and the PDF migration
copy/verify phase after Prisma generation. Preserve `AB_SYNC_TOKEN` and
`AB_PDF_DIRECTORY` across deployments. The PDF directory is outside the checkout
and survives code updates. Include this
feature's repository changes in the next normal release; a checkout reset to an
older commit removes any live feature overlay.

`package-feature.py` and `deploy-feature.py` support the narrowly scoped initial
live rollout. They merge only AB locale namespaces, the sidebar link and three
schema models, preserving unrelated workspace work. Live rollout backs up changed
files under `/var/backups/fragmento-ab-sync/<UTC>/`, records their previous
existence in `files.json`, applies only the AB migration, seeds the baseline and
builds in a separate directory before swapping `.next` and restarting the service.
No source folder credentials or secrets are included in the release archive.

For the initial AB rollout rollback, disable the Windows task, stop `fragmento.service`, restore the
backed-up source files and `.next`, remove only newly added files listed with
`false` in `files.json`, then start the service. Leave the additive database tables
in place so imported PDFs and review history are retained. Deployment attempts
have separate backups; the earliest backup contains the original application.

### Disk storage rollout

`package-disk-storage.py` and `deploy-disk-storage.py` deploy only the change
from BYTEA PDF storage to private disk files. They preserve existing page layouts,
back up the three AB tables with `pg_dump`, apply only the disk migration, copy
and verify existing PDFs without clearing database copies, then compile away
from the running build and swap it after success. Backups are in
`/var/backups/fragmento-ab-disk/<UTC>/`.

`verify-disk-storage.cjs` checks every retained version's file hash and
authenticated download, active downloads and anonymous access denial. Its
`--snapshot` / `--compare <snapshot.json>` options verify that all document
metadata, review fields and publication pointers stayed unchanged. After these
checks, run `npm run migrate:ab-pdfs -- --release-db-bytes`, then verify again with
`--expect-disk-only`. No client-side or Windows task change is needed.

Before rolling back to a build that only reads PDFs from the database, restore
its database PDF bytes from the retained pre-migration backup or verified disk
copies. Do not remove the private directory or restore an old database over
newer document/version records without reconciling them first.

The 140 initial PDFs total **49,121,273 bytes** (49.12 MB / 46.85 MiB), about
350.87 kB per PDF. At that average, 10,000 PDFs use about 3.51 GB, excluding
additional versions and backups. Server free space at migration was about
97 GiB. These are measured baseline figures, not a quota or guaranteed future
document size.

## Verification

### Local manual testing, without a push

The local database must be PostgreSQL on localhost. From `frontend`, run
`npm run ab:sync:local -- --setup` once. This creates a private local token in
ignored `.env.local` and an ignored config/state under `.local-data/ab-sync`.
Start or restart `npm run dev` so the app loads that token. Then either run
`npm run ab:sync:local` for one scan or `npm run ab:watch:local` for repeated scans
every 30 seconds while testing. Stop the watcher with Ctrl+C. Use `-- --port 3001`
if the development server is on a different port.

The source is the repository's local `ABs` folder, including subfolders and ZIPs.
Open `http://localhost:3000/admin/ab-imports` to inspect local results. Place a valid
AB in the local folder, allow 30–60 seconds for copying/stability checks in watch
mode, then create a local kitchen with the corresponding six-digit Kitchen code.
The retained active AB appears automatically when its kitchen page is loaded.
An identical existing PDF is deduplicated; it is not a new version.

The wrapper targets only `http://localhost:<port>` and refuses non-local database
configuration before writing settings or importing documents. Local scans use
their own state files and have no effect on the file-server task or its schedule.
No push, deployment or external storage is required for this local test.

#### Demonstrate an arrival when all PDFs are already imported

Run `npm run ab:watch:demo`. This watches the separate ignored repository folder
`AB-test`, using fresh scan history for each demo session. With the folder empty,
the latest **Local AB demo** run on the imports page shows **Imported: 0**. Copy
one existing, valid AB PDF into `AB-test`; after the automatic scan, refresh the
page and the run shows **Imported: 1**. Later scans show **Unchanged: 1**.

The PDF is genuinely parsed and submitted to the local API, but the application
deduplicates the already stored document. No kitchen, order or AB needs to be
deleted. Keep the dev server and demo watcher open while testing. The original
`ABs` source, normal local scan history and production remain unchanged. Remove
the demo copy after testing if you want the test folder empty for the next run.

### Automated checks

From `frontend`:

```text
node --test test/kitchen-ab-sync.test.js test/kitchen-ab-pdf-files.test.js test/order-kitchen-specifications.test.js
python -B -m unittest discover -s test -p test_ab_sync.py
```

Set `AB_SYNC_INTEGRATION=1` and run
`node --test test/kitchen-ab-store.integration.test.js` for the database test.
It uses and drops a temporary schema in the configured PostgreSQL database.
The integration test covers duplicate retries, active versions, changed-document
review, manual publication, replayed older PDFs, conflicting first versions and
run summaries. Runtime validation enforces PDF signatures, hashes, size limits,
exact identities, dates and article fields before persistence.
