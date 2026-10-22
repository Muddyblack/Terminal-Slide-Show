#!/usr/bin/env bash
# Runs once on the Pi's first boot, started by slideshow-firstboot.service.
# Installs everything from the bundle that tools/slideshow-sdcard put on the boot
# partition, using the same Ansible role as a normal fleet run, then removes the
# bundle (it contains this device's secrets) and reboots.
set -euo pipefail

bundle=/boot/firmware/slideshow
work=/var/lib/slideshow-provision

log() { echo "[slideshow-firstboot] $*"; }

[ -f "$work/done" ] && { log "already provisioned"; exit 0; }
[ -d "$bundle" ] || { log "no bundle at $bundle"; exit 1; }

mkdir -p "$work"
chmod 700 "$work"

# Wait up to 10 minutes for the network (Wi-Fi can take a while on a first boot)
log "waiting for the network"
for _ in $(seq 1 120); do
    getent hosts archive.raspberrypi.com >/dev/null 2>&1 && break
    sleep 5
done
getent hosts archive.raspberrypi.com >/dev/null 2>&1 || { log "no network"; exit 1; }

log "installing ansible-core"
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends ansible-core

# Keep the secrets on the root file system (mode 0600) instead of the world-readable boot partition
install -m 0600 "$bundle/vars.json" "$work/vars.json"
install -m 0644 "$bundle/provision.yml" "$work/provision.yml"

log "installing the collection"
ansible-galaxy collection install --no-deps -p "$work/collections" "$bundle"/collections/*.tar.gz

log "running the role"
ANSIBLE_COLLECTIONS_PATH="$work/collections" ANSIBLE_NOCOLOR=1 \
    ansible-playbook -i localhost, -c local "$work/provision.yml" -e "@$work/vars.json"

log "removing the bundle"
find "$bundle" -type f -exec shred -u {} +
rm -rf "$bundle"
shred -u "$work/vars.json"
touch "$work/done"

systemctl disable slideshow-firstboot.service
log "done, rebooting"
systemctl reboot
