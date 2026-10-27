"""Create a narrowly scoped live AB release without unrelated workspace changes."""
import argparse
from pathlib import Path
import tarfile

ROOT = Path(__file__).resolve().parents[2]
FILES = [
    'frontend/app/admin/ab-imports',
    'frontend/app/admin/orders/[id]/page.js',
    'frontend/app/admin/px-orders/[id]/page.js',
    'frontend/app/admin/kitchens/[id]/page.js',
    'frontend/app/api/admin/ab-imports',
    'frontend/app/api/admin/kitchen-specifications',
    'frontend/app/api/internal/ab-sync',
    'frontend/components/admin-order-kitchen-specifications.jsx',
    'frontend/components/admin-order-kitchen-specifications.module.css',
    'frontend/components/admin-shell-client.js',
    'frontend/lib/kitchen-ab-runtime.js',
    'frontend/lib/kitchen-ab-store.js',
    'frontend/lib/kitchen-ab-validation.js',
    'frontend/lib/kitchen-ab-pdf-files.js',
    'frontend/lib/kitchen-ab-pdf-migration.js',
    'frontend/lib/order-kitchen-specifications.js',
    'frontend/data/kitchen-specifications',
    'frontend/locales/admin.en.json',
    'frontend/locales/admin.de.json',
    'frontend/prisma/schema.prisma',
    'frontend/prisma/migrations/20261015160000_add_kitchen_ab_sync',
    'frontend/prisma/migrations/20261015180000_store_kitchen_ab_pdfs_on_disk',
    'frontend/prisma/migrations/20261015190000_add_kitchen_ab_last_read_at',
    'frontend/scripts/seed-kitchen-ab-documents.mjs',
    'frontend/scripts/migrate-kitchen-ab-pdfs.mjs',
    'frontend/next.config.mjs',
]

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    with tarfile.open(args.output, 'w:gz') as archive:
        for relative in FILES:
            archive.add(ROOT / relative, arcname=relative)
        for name in ['apply-migration.cjs', 'apply-disk-migration.cjs', 'deploy-feature.py']:
            archive.add(Path(__file__).parent / name, arcname=name)
    print(f'Created {args.output} ({args.output.stat().st_size} bytes)')
