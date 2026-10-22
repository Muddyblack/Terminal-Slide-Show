"""Tests for tools/slideshow-sdcard. Run: python3 -m unittest tools/test_sdcard.py"""
import importlib.machinery
import importlib.util
import json
import struct
import tempfile
import unittest
from pathlib import Path

loader = importlib.machinery.SourceFileLoader("sdcard", str(Path(__file__).parent / "slideshow-sdcard"))
spec = importlib.util.spec_from_loader("sdcard", loader)
sdcard = importlib.util.module_from_spec(spec)
loader.exec_module(sdcard)

GB = 1000 ** 3


def disk(name, size, mounts=(), children=(), **extra):
    node = {"name": name, "path": f"/dev/{name}", "size": size, "type": "disk", "rm": False,
            "hotplug": False, "tran": None, "mountpoints": list(mounts) or [None],
            "children": [{"name": f"{name}p{i}", "type": "part", "mountpoints": [m]} for i, m in enumerate(children, 1)]}
    node.update(extra)
    return node


class CandidateDisks(unittest.TestCase):
    def names(self, *disks):
        return [d["name"] for d in sdcard.candidate_disks({"blockdevices": list(disks)})]

    def test_offers_usb_and_sd_cards(self):
        self.assertEqual(self.names(
            disk("sdb", 32 * GB, tran="usb", rm=True),
            disk("mmcblk0", 16 * GB),
        ), ["sdb", "mmcblk0"])

    def test_never_offers_the_system_disk(self):
        self.assertEqual(self.names(
            disk("nvme0n1", 1000 * GB, children=["/boot", "/", "/home"]),
            disk("sda", 500 * GB, tran="sata", children=["/"]),
        ), [])

    def test_never_offers_a_removable_disk_that_holds_the_system(self):
        # e.g. a system running from a USB drive
        self.assertEqual(self.names(disk("sdb", 64 * GB, tran="usb", rm=True, children=["/boot", "/"])), [])

    def test_a_disk_with_other_mounts_is_still_offered(self):
        self.assertEqual(self.names(
            disk("sdb", 32 * GB, tran="usb", rm=True, children=["/run/media/me/bootfs", "/run/media/me/rootfs"]),
        ), ["sdb"])

    def test_ignores_internal_disks_and_huge_disks(self):
        self.assertEqual(self.names(
            disk("sda", 500 * GB, tran="sata"),                      # internal, not removable
            disk("sdc", 4000 * GB, tran="usb", rm=True),             # bigger than 1 TB
        ), [])


class Config(unittest.TestCase):
    settings = {
        "slideshow_admin_user": "admin",
        "slideshow_admin_ssh_keys": ["ssh-ed25519 AAAA test"],
        "slideshow_timezone": "Europe/Berlin",
    }

    def test_user_data_is_cloud_config_with_key_only_login(self):
        text = sdcard.user_data("lobby-pi", self.settings, None)
        self.assertTrue(text.startswith("#cloud-config\n"))
        data = json.loads(text.split("\n", 1)[1])
        self.assertEqual(data["hostname"], "lobby-pi")
        self.assertEqual(data["timezone"], "Europe/Berlin")
        self.assertFalse(data["ssh_pwauth"])
        user = data["users"][0]
        self.assertTrue(user["lock_passwd"])
        self.assertEqual(user["ssh_authorized_keys"], ["ssh-ed25519 AAAA test"])
        paths = [f["path"] for f in data["write_files"]]
        self.assertIn("/usr/local/sbin/slideshow-firstboot", paths)

    def test_refuses_a_device_nobody_could_log_in_to(self):
        with self.assertRaises(sdcard.Fail):
            sdcard.user_data("x", {"slideshow_admin_user": "admin"}, None)

    def test_wifi_needs_a_country(self):
        with self.assertRaises(sdcard.Fail):
            sdcard.network_config({"ssid": "Office", "password": "pw"})

    def test_network_config(self):
        self.assertIsNone(sdcard.network_config(None))
        data = json.loads(sdcard.network_config({"ssid": "Office", "password": "pw", "country": "DE"}))
        wlan = data["network"]["wifis"]["wlan0"]
        self.assertEqual(wlan["regulatory-domain"], "DE")
        self.assertEqual(wlan["access-points"]["Office"]["password"], "pw")


class Image(unittest.TestCase):
    def test_first_partition_offset(self):
        sector0 = bytearray(512)
        sector0[446 + 8:446 + 12] = struct.pack("<I", 2048)
        sector0[510:512] = b"\x55\xaa"
        with tempfile.NamedTemporaryFile() as handle:
            handle.write(sector0)
            handle.flush()
            self.assertEqual(sdcard.first_partition_offset(handle.name), 2048 * 512)

    def test_rejects_an_image_without_a_partition_table(self):
        with tempfile.NamedTemporaryFile() as handle:
            handle.write(bytes(512))
            handle.flush()
            with self.assertRaises(sdcard.Fail):
                sdcard.first_partition_offset(handle.name)


if __name__ == "__main__":
    unittest.main()
