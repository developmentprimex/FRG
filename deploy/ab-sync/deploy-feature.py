"""Install the reviewed AB feature bundle on the existing Hetzner checkout.

Run as root after extracting the feature files beneath /root/fragmento-ab-release.
Backups are made before any tracked file is changed. No unrelated deployment,
seed, package installation, or migration is executed.
"""
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import shutil
import subprocess


APP = Path('/var/www/fragmento')
RELEASE = Path('/root/fragmento-ab-release')
BACKUP = Path('/var/backups/fragmento-ab-sync') / datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
BACKUP.mkdir(parents=True, exist_ok=True)
os.chmod(BACKUP, 0o700)
changed_files = {}


def backup(relative):
    relative = str(relative)
    target = APP / relative
    if relative in changed_files:
        return target
    changed_files[relative] = target.exists()
    (BACKUP / 'files.json').write_text(json.dumps(changed_files, indent=2))
    if target.exists():
        destination = BACKUP / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(target, destination)
    return target


def write(relative, text):
    target = backup(relative)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding='utf-8')


for file in (RELEASE / 'frontend').rglob('*'):
    if not file.is_file():
        continue
    relative = file.relative_to(RELEASE)
    if relative.as_posix() in ['frontend/locales/admin.en.json', 'frontend/locales/admin.de.json',
                              'frontend/components/admin-shell-client.js', 'frontend/prisma/schema.prisma',
                              'frontend/app/admin/orders/[id]/page.js', 'frontend/app/admin/px-orders/[id]/page.js',
                              'frontend/app/admin/kitchens/[id]/page.js', 'frontend/next.config.mjs']:
        continue
    target = backup(relative)
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(file, target)

# Add the section to the server's existing pages, preserving its current order
# presentation and dependencies even if the workspace has a newer layout.
for section, label in [('orders', 'orderDetailAdmin.orderItems'), ('px-orders', 'pxOrdersAdmin.orderItems'), ('kitchens', 'contractDetailAdmin.appliances')]:
    relative = f'frontend/app/admin/{section}/[id]/page.js'
    page = (APP / relative).read_text()
    if 'loadOrderKitchenSpecifications' in page:
        continue
    anchor = re.search(r'        <AdminSection\s+title=\{<AdminText i18nKey="' + re.escape(label) + r'"', page)
    if not anchor:
        raise ValueError('AB section insertion point missing: ' + relative)
    value = '{ kitchen }' if section == 'kitchens' else 'order'
    suffix = ' referenceOnly' if section == 'kitchens' else ''
    component = '        <AdminSection title={<AdminText i18nKey="kitchenSpecificationsAdmin.title" fallback="Kitchen specifications" />}>\n'
    component += f'          <AdminOrderKitchenSpecifications details={{await loadOrderKitchenSpecifications({value})}}{suffix} />\n'
    component += '        </AdminSection>\n\n'
    page = page[:anchor.start()] + component + page[anchor.start():]
    imports = 'import { AdminOrderKitchenSpecifications } from "../../../../components/admin-order-kitchen-specifications";\n'
    imports += 'import { loadOrderKitchenSpecifications } from "../../../../lib/kitchen-ab-runtime";\n'
    write(relative, imports + page)

relative = 'frontend/next.config.mjs'
config = (APP / relative).read_text()
if '"/api/admin/kitchen-specifications/*/pdf"' not in config:
    if 'outputFileTracingIncludes:' in config:
        raise ValueError('Merge existing outputFileTracingIncludes manually before deployment.')
    anchor = '    devIndicators: false,'
    if anchor not in config:
        raise ValueError('Next configuration insertion point missing.')
    config = config.replace(anchor, anchor + '\n    outputFileTracingIncludes: {\n      "/api/admin/kitchen-specifications/*/pdf": ["./data/kitchen-specifications/pdfs/*.[pP][dD][fF]"],\n    },', 1)
    write(relative, config)

for language in ['en', 'de']:
    relative = f'frontend/locales/admin.{language}.json'
    current = json.loads((APP / relative).read_text())
    incoming = json.loads((RELEASE / relative).read_text())
    for namespace in ['kitchenSpecificationsAdmin', 'abImportsAdmin']:
        current[namespace] = incoming[namespace]
    write(relative, json.dumps(current, ensure_ascii=False, indent=2) + '\n')

relative = 'frontend/components/admin-shell-client.js'
navigation = (APP / relative).read_text()
if 'href: "/admin/ab-imports"' not in navigation:
    anchor = next(line for line in navigation.splitlines() if 'href: "/admin/kitchens"' in line)
    navigation = navigation.replace(anchor, anchor + '\n          { href: "/admin/ab-imports", labelKey: "abImportsAdmin.title", fallback: "AB imports", icon: ContractsIcon, requiresSuperAdmin: true },', 1)
    write(relative, navigation)

relative = 'frontend/prisma/schema.prisma'
schema = (APP / relative).read_text()
incoming = (RELEASE / relative).read_text()
for name in ['KitchenAbDocument', 'KitchenAbPublication', 'KitchenAbSyncRun']:
    model = re.search(r'model ' + name + r' \{[\s\S]*?\n\}', incoming).group(0)
    if f'model {name} ' not in schema:
        schema += '\n' + model + '\n'
    else:
        schema = re.sub(r'model ' + name + r' \{[\s\S]*?\n\}', lambda match: model, schema, count=1)
write(relative, schema)

relative = 'frontend/package.json'
package = json.loads((APP / relative).read_text())
package['scripts']['seed:ab-documents'] = 'node scripts/seed-kitchen-ab-documents.mjs'
package['scripts']['migrate:ab-pdfs'] = 'node scripts/migrate-kitchen-ab-pdfs.mjs'
write(relative, json.dumps(package, ensure_ascii=False, indent=2) + '\n')

token = Path('/root/fragmento-ab-sync-token').read_text().strip()
if not re.fullmatch(r'[0-9a-f]{64}', token):
    raise ValueError('Unexpected sync token format')
relative = 'frontend/.env'
environment = (APP / relative).read_text()
environment = re.sub(r'^AB_SYNC_TOKEN=.*(?:\n|$)', '', environment, flags=re.M)
write(relative, environment.rstrip() + '\nAB_SYNC_TOKEN="' + token + '"\n')
os.chmod(APP / relative, 0o600)
storage = Path('/var/lib/fragmento/ab-pdfs')
storage.parent.mkdir(parents=True, exist_ok=True, mode=0o750)
storage.mkdir(exist_ok=True, mode=0o700)
subprocess.run(['chown', 'deploy:deploy', str(storage.parent), str(storage)], check=True)
environment = (APP / relative).read_text()
directory_setting = re.search(r'^AB_PDF_DIRECTORY=(.*)$', environment, flags=re.M)
if not directory_setting or not directory_setting.group(1).strip().strip('"\''):
    environment = re.sub(r'^AB_PDF_DIRECTORY=.*(?:\n|$)', '', environment, flags=re.M)
    write(relative, environment.rstrip() + '\nAB_PDF_DIRECTORY="' + str(storage) + '"\n')

subprocess.run(['chown', '-R', 'deploy:deploy', str(APP / 'frontend/data/kitchen-specifications')], check=True)
for file in (RELEASE / 'frontend').rglob('*'):
    if file.is_file():
        subprocess.run(['chown', 'deploy:deploy', str(APP / file.relative_to(RELEASE))], check=True)
for relative in ['frontend/package.json', 'frontend/.env', 'frontend/prisma/schema.prisma']:
    subprocess.run(['chown', 'deploy:deploy', str(APP / relative)], check=True)

# Apply only the three additive AB tables and register just this migration.
subprocess.run(['/usr/local/bin/node', str(RELEASE / 'apply-migration.cjs')], cwd=APP / 'frontend', check=True)
subprocess.run(['/usr/local/bin/node', str(RELEASE / 'apply-disk-migration.cjs')], cwd=APP / 'frontend', check=True)
subprocess.run(['sudo', '-u', 'deploy', '/usr/local/bin/node', 'scripts/seed-kitchen-ab-documents.mjs'], cwd=APP / 'frontend', check=True)
subprocess.run(['sudo', '-u', 'deploy', '/usr/local/bin/node', 'scripts/migrate-kitchen-ab-pdfs.mjs'], cwd=APP / 'frontend', check=True)
# Build away from the running application's .next directory. Keep its working
# build intact until the replacement has compiled successfully.
build_dir = Path('/var/www') / ('fragmento-ab-build-' + BACKUP.name)
shutil.copytree(APP / 'frontend', build_dir, ignore=shutil.ignore_patterns('node_modules', '.next', '.next-dev', '.git', '.local-data'))
os.symlink(APP / 'frontend/node_modules', build_dir / 'node_modules', target_is_directory=True)
subprocess.run(['chown', '-R', 'deploy:deploy', str(build_dir)], check=True)
subprocess.run(['sudo', '-u', 'deploy', '/usr/local/bin/node', 'node_modules/next/dist/bin/next', 'build'], cwd=build_dir, check=True)
subprocess.run(['systemctl', 'stop', 'fragmento.service'], check=True)
old_build = APP / 'frontend/.next'
saved_build = BACKUP / '.next'
if old_build.exists():
    old_build.rename(saved_build)
(build_dir / '.next').rename(old_build)
try:
    subprocess.run(['systemctl', 'start', 'fragmento.service'], check=True)
    subprocess.run(['systemctl', 'is-active', 'fragmento.service'], check=True)
except Exception:
    subprocess.run(['systemctl', 'stop', 'fragmento.service'], check=False)
    old_build.rename(build_dir / '.next-failed')
    if saved_build.exists():
        saved_build.rename(old_build)
    subprocess.run(['systemctl', 'start', 'fragmento.service'], check=False)
    raise
shutil.rmtree(build_dir)
print('AB feature deployed; backup: ' + str(BACKUP))
