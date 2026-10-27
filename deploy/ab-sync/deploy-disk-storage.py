"""Deploy just the AB private-disk change without unrelated checkout changes."""
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import time
import urllib.request

APP = Path('/var/www/fragmento')
RELEASE = Path('/root/fragmento-ab-disk-release')
BACKUP = Path('/var/backups/fragmento-ab-disk') / datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
STORAGE = Path('/var/lib/fragmento/ab-pdfs')
BACKUP.mkdir(parents=True, mode=0o700)
manifest = {}


def backup(relative):
    relative = str(relative)
    target = APP / relative
    if relative not in manifest:
        manifest[relative] = target.exists()
        (BACKUP / 'files.json').write_text(json.dumps(manifest, indent=2))
        if target.exists():
            saved = BACKUP / relative
            saved.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(target, saved)
    return target


def write(relative, value):
    target = backup(relative)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(value)
    subprocess.run(['chown', 'deploy:deploy', str(target)], check=True)


print('Rollback backup: ' + str(BACKUP), flush=True)
# Back up the existing documents, version choices and import history before
# modifying any database structure or releasing the legacy BYTEA copies.
with (BACKUP / 'ab-before-disk.dump').open('wb') as saved:
    os.chmod(saved.name, 0o600)
    subprocess.run(['sudo', '-u', 'postgres', 'pg_dump', '--format=custom',
        '--table=public."KitchenAbDocument"', '--table=public."KitchenAbPublication"',
        '--table=public."KitchenAbSyncRun"', 'fragmento'], stdout=saved, check=True)

STORAGE.parent.mkdir(parents=True, exist_ok=True, mode=0o750)
STORAGE.mkdir(exist_ok=True, mode=0o700)
subprocess.run(['chown', 'deploy:deploy', str(STORAGE.parent), str(STORAGE)], check=True)
os.chmod(STORAGE, 0o700)
for file in (RELEASE / 'frontend').rglob('*'):
    if not file.is_file():
        continue
    relative = file.relative_to(RELEASE)
    if relative.as_posix() == 'frontend/prisma/schema.prisma':
        continue
    target = backup(relative)
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(file, target)
    subprocess.run(['chown', 'deploy:deploy', str(target)], check=True)

relative = 'frontend/prisma/schema.prisma'
schema = (APP / relative).read_text()
old_model = re.search(r'model KitchenAbDocument \{[\s\S]*?\n\}', schema).group(0)
incoming = (RELEASE / relative).read_text()
new_model = re.search(r'model KitchenAbDocument \{[\s\S]*?\n\}', incoming).group(0)
write(relative, schema.replace(old_model, new_model, 1))
relative = 'frontend/package.json'
package = json.loads((APP / relative).read_text())
package['scripts']['migrate:ab-pdfs'] = 'node scripts/migrate-kitchen-ab-pdfs.mjs'
write(relative, json.dumps(package, indent=2) + '\n')
relative = 'frontend/.env'
environment = (APP / relative).read_text()
environment = re.sub(r'^AB_PDF_DIRECTORY=.*(?:\n|$)', '', environment, flags=re.M)
write(relative, environment.rstrip() + '\nAB_PDF_DIRECTORY="' + str(STORAGE) + '"\n')
os.chmod(APP / relative, 0o600)

subprocess.run(['/usr/local/bin/node', str(RELEASE / 'apply-disk-migration.cjs')], cwd=APP / 'frontend', check=True)
# First phase leaves all database bytes intact for the running old build.
subprocess.run(['sudo', '-u', 'deploy', '/usr/local/bin/node', 'scripts/migrate-kitchen-ab-pdfs.mjs'], cwd=APP / 'frontend', check=True)

build_dir = Path('/var/www') / ('fragmento-ab-disk-build-' + BACKUP.name)
shutil.copytree(APP / 'frontend', build_dir, ignore=shutil.ignore_patterns('node_modules', '.next', '.next-dev', '.git', '.local-data'))
os.symlink(APP / 'frontend/node_modules', build_dir / 'node_modules', target_is_directory=True)
subprocess.run(['chown', '-R', 'deploy:deploy', str(build_dir)], check=True)
subprocess.run(['sudo', '-u', 'deploy', '/usr/local/bin/node', 'node_modules/next/dist/bin/next', 'build'], cwd=build_dir, check=True)

subprocess.run(['systemctl', 'stop', 'fragmento.service'], check=True)
live_build = APP / 'frontend/.next'
if live_build.exists():
    live_build.rename(BACKUP / '.next')
(build_dir / '.next').rename(live_build)
try:
    subprocess.run(['systemctl', 'start', 'fragmento.service'], check=True)
    for attempt in range(12):
        try:
            with urllib.request.urlopen('http://127.0.0.1:5300/kitchens/ab-105806', timeout=15) as response:
                if response.status == 200:
                    break
        except Exception:
            if attempt == 11:
                raise
            time.sleep(2)
    subprocess.run(['systemctl', 'is-active', 'fragmento.service'], check=True)
except Exception:
    subprocess.run(['systemctl', 'stop', 'fragmento.service'], check=False)
    live_build.rename(build_dir / '.next-failed')
    if (BACKUP / '.next').exists():
        (BACKUP / '.next').rename(live_build)
    subprocess.run(['systemctl', 'start', 'fragmento.service'], check=False)
    raise

# Deliberately do not release database bytes here: verify authenticated PDF
# downloads against every stored hash first, then run --release-db-bytes.
shutil.rmtree(build_dir)
print('Disk-aware application active. Verify downloads, then release database PDF bytes.', flush=True)
print('Rollback backup: ' + str(BACKUP), flush=True)
