"""Exercise the workflow's collision handling with real Git repositories."""
from pathlib import Path
import os
import shutil
import subprocess
import tempfile
import textwrap
import unittest


WORKFLOW = Path(__file__).resolve().parents[1] / '.github/workflows/deploy-hetzner.yml'
BASH = shutil.which('bash')
if os.name == 'nt':
    BASH = str(Path(shutil.which('git')).parents[1] / 'bin/bash.exe')


class DeployCollisionTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='fragmento-deploy-')
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.repo = self.root / 'checkout'
        self.repo.mkdir()
        self.backups = self.root / 'backups'
        self.git('init', '-q')
        self.git('config', 'user.name', 'Deploy test')
        self.git('config', 'user.email', 'deploy-test@example.invalid')
        self.git('config', 'commit.gpgsign', 'false')
        self.write('existing.txt', 'tracked original')
        self.git('add', '.')
        self.git('commit', '-qm', 'Production baseline')
        self.baseline = self.git('rev-parse', 'HEAD').stdout.strip()

    def git(self, *args):
        return subprocess.run(['git', *args], cwd=self.repo, check=True,
                              text=True, capture_output=True)

    def write(self, relative, contents):
        target = self.repo / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(contents, encoding='utf-8')

    def incoming(self, files):
        for relative, contents in files.items():
            self.write(relative, contents)
        self.git('add', '.')
        self.git('commit', '-qm', 'Incoming release')
        self.target = self.git('rev-parse', 'HEAD').stdout.strip()
        self.git('fetch', '.', 'HEAD')
        self.git('reset', '--hard', self.baseline)

    def deploy(self):
        workflow = WORKFLOW.read_text(encoding='utf-8')
        script = textwrap.dedent(workflow.split("bash <<'BASH'\n", 1)[1].split('\n            BASH', 1)[0])
        script = script.replace('/var/backups/fragmento-deploy', self.backups.as_posix())
        script += '\ngit merge --ff-only FETCH_HEAD\n'
        return subprocess.run([BASH, '-eu', '-c', script], cwd=self.repo,
                              capture_output=True, text=True)

    def test_preserves_ab_code_pdfs_migrations_and_unrelated_local_data(self):
        incoming = {
            'frontend/app/admin/ab-imports/page.js': 'incoming code',
            'frontend/app/api/admin/kitchen-specifications/[slug]/pdf/route.js': 'incoming route',
            'frontend/data/kitchen-specifications/pdfs/AB 104968 - WHG 1.0.001.PDF': 'incoming PDF',
            'frontend/prisma/migrations/20261015160000_add_kitchen_ab_sync/migration.sql': 'incoming migration',
        }
        self.incoming(incoming)
        for relative in incoming:
            self.write(relative, 'server copy: ' + relative)
        self.write('frontend/.env', 'local settings')
        self.write('frontend/.local-data/ab-pdfs/upload.pdf', 'live upload')
        self.write('existing.txt', 'local tracked edit')
        result = self.deploy()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        backups = list(self.backups.iterdir())
        self.assertEqual(len(backups), 1)
        for relative, contents in incoming.items():
            self.assertEqual((self.repo / relative).read_text(), contents)
            self.assertEqual((backups[0] / relative).read_text(), 'server copy: ' + relative)
        self.assertEqual((self.repo / 'frontend/.env').read_text(), 'local settings')
        self.assertEqual((self.repo / 'frontend/.local-data/ab-pdfs/upload.pdf').read_text(), 'live upload')
        self.assertEqual((self.repo / 'existing.txt').read_text(), 'local tracked edit')
        self.assertEqual(self.git('rev-parse', 'HEAD').stdout.strip(), self.target)

    def test_no_collisions_and_repeated_deploy_need_no_backup(self):
        self.incoming({'new.txt': 'incoming'})
        for _ in range(2):
            result = self.deploy()
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertFalse(self.backups.exists())

    def test_diverged_history_stops_before_moving_files(self):
        self.incoming({'new.txt': 'incoming'})
        self.write('existing.txt', 'diverged')
        self.git('commit', '-qam', 'Server-only commit')
        self.write('new.txt', 'server copy')
        result = self.deploy()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual((self.repo / 'new.txt').read_text(), 'server copy')
        self.assertFalse(self.backups.exists())

    def test_backup_failure_prevents_merge_and_keeps_local_file(self):
        self.incoming({'new.txt': 'incoming'})
        self.write('new.txt', 'server copy')
        self.backups.write_text('blocks backup directory')
        result = self.deploy()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual((self.repo / 'new.txt').read_text(), 'server copy')
        self.assertEqual(self.git('rev-parse', 'HEAD').stdout.strip(), self.baseline)


if __name__ == '__main__':
    unittest.main()
