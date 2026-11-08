"""Exercise real role ordering and cleanup locally, without touching services.

Device-specific tasks are replaced with fixtures; Ansible still executes the
role's main task list, notifications, tag filtering and release cleanup.
"""

import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


ROLE = Path(__file__).resolve().parents[1] / "ansible/roles/slideshow"


class DeploymentTests(unittest.TestCase):
    def run_deployment(self, *, healthy=True, restart_ok=True, tags=None, remote=False):
        with tempfile.TemporaryDirectory(prefix="slideshow-test-") as directory:
            root = Path(directory)
            role = root / "roles/slideshow"
            shutil.copytree(ROLE / "tasks", role / "tasks")
            for task in (role / "tasks").glob("*.yml"):
                if task.name not in {"main.yml", "cleanup.yml"}:
                    task.write_text("[]\n")

            def write(path, value):
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(json.dumps(value))

            write(role / "tasks/app.yml", [{
                "name": "Simulate a changed release",
                "ansible.builtin.debug": {"msg": "Release changed"},
                "changed_when": True,
                "notify": "Restart the backend",
            }])
            write(role / "handlers/main.yml", [{
                "name": "Restart the backend",
                "ansible.builtin.assert": {
                    "that": [restart_ok], "fail_msg": "Simulated restart failure",
                },
            }, {
                "name": "Record the completed restart",
                "listen": "Restart the backend",
                "ansible.builtin.set_fact": {"test_restarted": True},
            }])
            write(role / "tasks/healthcheck.yml", [{
                "name": "Verify the new release is healthy after restarting",
                "ansible.builtin.assert": {"that": [
                    "test_restarted | default(false) or slideshow_backend_mode == 'remote'",
                    healthy,
                ], "fail_msg": "Simulated health failure"},
            }])
            releases = root / "releases"
            for index, name in enumerate(["old", "previous", "current"]):
                release = releases / f"terminal-slide-show-{name}"
                release.mkdir(parents=True)
                os.utime(release, (1000 + index, 1000 + index))
            write(root / "play.yml", [{
                "name": "Test deployment sequencing",
                "hosts": "localhost",
                "gather_facts": False,
                "vars": {
                    "ansible_python_interpreter": sys.executable,
                    "slideshow_backend_mode": "remote" if remote else "local",
                    "slideshow_display_mode": "none",
                    "slideshow_readonly_root": False,
                    "slideshow_install_dir": str(root),
                    "slideshow_release_dir": str(releases / "terminal-slide-show-current"),
                    "slideshow_keep_releases": 2,
                },
                "roles": ["slideshow"],
            }])
            command = ["ansible-playbook", "-i", "localhost,", "-c", "local", str(root / "play.yml")]
            if tags:
                command += ["--tags", tags]
            result = subprocess.run(command, cwd=root, capture_output=True, text=True, timeout=60,
                                    env={**os.environ, "ANSIBLE_LOCAL_TEMP": str(root / "tmp")})
            output = result.stdout + result.stderr
            self.assertIn("PLAY RECAP", output, output)
            self.assertEqual(result.returncode, 0 if healthy and restart_ok else 2, output)
            if not restart_ok:
                self.assertIn("Simulated restart failure", output, output)
            elif not healthy:
                self.assertIn("Simulated health failure", output, output)
            remaining = {path.name for path in releases.iterdir()}
            self.assertIn("terminal-slide-show-current", remaining)
            self.assertIn("terminal-slide-show-previous", remaining)
            self.assertEqual("terminal-slide-show-old" in remaining,
                             remote or not (healthy and restart_ok))

    def test_success_prunes_after_restart(self):
        self.run_deployment()

    def test_failed_health_preserves_releases(self):
        self.run_deployment(healthy=False)

    def test_failed_restart_preserves_releases(self):
        self.run_deployment(restart_ok=False)

    def test_tagged_update_checks_health(self):
        self.run_deployment(tags="app", healthy=False)

    def test_tagged_update_restarts_before_cleanup(self):
        self.run_deployment(tags="app")

    def test_remote_backend_skips_cleanup(self):
        self.run_deployment(remote=True)


if __name__ == "__main__":
    unittest.main()
