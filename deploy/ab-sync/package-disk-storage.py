"""Package only the private disk storage change for the existing AB feature."""
import argparse
from pathlib import Path
import tarfile

ROOT = Path(__file__).resolve().parents[2]
FILES = [
    'frontend/lib/kitchen-ab-store.js',
    'frontend/lib/kitchen-ab-pdf-files.js',
    'frontend/lib/kitchen-ab-pdf-migration.js',
    'frontend/app/api/admin/kitchen-specifications/[slug]/pdf/route.js',
    'frontend/scripts/seed-kitchen-ab-documents.mjs',
    'frontend/scripts/migrate-kitchen-ab-pdfs.mjs',
    'frontend/prisma/schema.prisma',
    'frontend/prisma/migrations/20261015180000_store_kitchen_ab_pdfs_on_disk',
    'frontend/prisma/migrations/20261015190000_add_kitchen_ab_last_read_at',
]
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    with tarfile.open(args.output, 'w:gz') as archive:
        for relative in FILES:
            archive.add(ROOT / relative, arcname=relative)
        for name in ['apply-disk-migration.cjs', 'deploy-disk-storage.py', 'verify-disk-storage.cjs']:
            archive.add(Path(__file__).parent / name, arcname=name)
    print(f'Created {args.output} ({args.output.stat().st_size} bytes)')
