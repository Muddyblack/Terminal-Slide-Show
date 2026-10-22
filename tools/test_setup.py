"""Tests for tools/slideshow-setup. Run: python3 -m unittest tools/test_setup.py"""
import importlib.machinery
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

loader = importlib.machinery.SourceFileLoader("setup_wizard", str(Path(__file__).parent / "slideshow-setup"))
spec = importlib.util.spec_from_loader("setup_wizard", loader)
wizard = importlib.util.module_from_spec(spec)
loader.exec_module(wizard)


def asset(name):
    return {"name": name, "browser_download_url": f"https://example.org/{name}"}


class Releases(unittest.TestCase):
    def test_accepts_a_release_that_ships_the_tarball_and_checksum(self):
        release = {"tag_name": "v1.2.0", "assets": [
            asset("terminal-slide-show-1.2.0.tar.gz"), asset("terminal-slide-show-1.2.0.tar.gz.sha256")]}
        version, url = wizard.release_with_tarball(release)
        self.assertEqual(version, "1.2.0")
        self.assertTrue(url.endswith(".sha256"))

    def test_rejects_old_releases_without_the_tarball(self):
        self.assertIsNone(wizard.release_with_tarball({"tag_name": "v2.1.2", "assets": []}))

    def test_rejects_a_release_without_its_checksum(self):
        release = {"tag_name": "v1.2.0", "assets": [asset("terminal-slide-show-1.2.0.tar.gz")]}
        self.assertIsNone(wizard.release_with_tarball(release))


class ServiceAccount(unittest.TestCase):
    def read(self, content):
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as handle:
            handle.write(content)
        return wizard.read_service_account(handle.name)

    def test_reads_the_email(self):
        raw, email = self.read(json.dumps({"type": "service_account", "client_email": "a@b.iam", "private_key": "k"}))
        self.assertEqual(email, "a@b.iam")

    def test_rejects_other_json_and_broken_files(self):
        with self.assertRaises(ValueError):
            self.read(json.dumps({"type": "authorized_user"}))
        with self.assertRaises(ValueError):
            self.read("not json")
        with self.assertRaises(ValueError):
            wizard.read_service_account("/does/not/exist.json")


class Validation(unittest.TestCase):
    def setUp(self):
        self.w = wizard.Wizard("de")

    def test_device_names(self):
        self.assertTrue(wizard.HOSTNAME.match("lobby-pi"))
        for bad in ("Lobby", "-pi", "pi_1", "a b", ""):
            self.assertFalse(wizard.HOSTNAME.match(bad), bad)

    def test_times(self):
        check = wizard.check_time(self.w)
        self.assertIsNone(check("07:30"))
        self.assertIsNotNone(check("7:30"))
        self.assertIsNotNone(check("25:00"))

    def test_timezones_and_networks(self):
        self.assertIsNone(wizard.check_timezone(self.w)("Europe/Berlin"))
        self.assertIsNotNone(wizard.check_timezone(self.w)("Mars/Base"))
        self.assertIsNone(wizard.check_network(self.w)("192.168.1.0/24"))
        self.assertIsNotNone(wizard.check_network(self.w)("everywhere"))

    def test_quoting_keeps_yaml_safe(self):
        self.assertEqual(wizard.q('a "b": c'), '"a \\"b\\": c"')

    def test_every_text_exists_in_both_languages(self):
        self.assertEqual(set(wizard.TEXT["de"]), set(wizard.TEXT["en"]))


if __name__ == "__main__":
    unittest.main()
