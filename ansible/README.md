# Managing a fleet of Raspberry Pis

An Ansible collection that sets up and maintains Terminal Slide Show on Raspberry Pi 3, 4 and 5 running **Raspberry Pi OS Lite (Debian 13 "trixie")**.

You keep your own fleet in your own (private) repository: the inventory, per-site and per-device settings, and your encrypted secrets. This repository only provides the collection, so nothing about your devices ever lives here.

```
your-fleet/            <- your private repo
├── inventory.yml      which devices exist, grouped by site
├── group_vars/        settings per site (location, Drive folder, ...)
├── host_vars/         settings per device (display mode, schedule, ...)
├── requirements.yml   pins this collection
└── ansible.cfg
```

Start from [`example/`](example/): it is a complete, working layout.

## Quick start

1. **Flash each Pi** with Raspberry Pi Imager: *Raspberry Pi OS Lite (64-bit)*, set a hostname, create an admin user, enable SSH with **public-key authentication only**, and enter Wi-Fi if needed.
2. **Create your fleet repo** from the example and install the collection:
   ```bash
   cp -r example/ ../my-fleet && cd ../my-fleet
   ansible-galaxy collection install -r requirements.yml
   ```
3. **Edit** `inventory.yml`, `group_vars/` and `host_vars/`. Put your secrets in an encrypted file:
   ```bash
   cp group_vars/slideshow/vault.example.yml group_vars/slideshow/vault.yml
   ansible-vault encrypt group_vars/slideshow/vault.yml
   ```
4. **Preview, then apply** to one device first:
   ```bash
   ansible-playbook muddyblack.terminal_slideshow.site --limit lobby-pi --check --diff
   ansible-playbook muddyblack.terminal_slideshow.site --limit lobby-pi
   ```
5. Roll out to the rest: `ansible-playbook muddyblack.terminal_slideshow.site`.

## Playbooks

| Playbook | What it does |
| --- | --- |
| `site` | Sets up or reconciles devices. Safe to re-run, and it puts a hand-edited device back to the declared state. |
| `update` | Rolls out a new `slideshow_version` one device at a time and stops at the first device that is not healthy. `-e upgrade_os=true` also installs all OS updates (Chromium included) and reboots if needed. |
| `status` | One line per device: model, app version, Chromium version, kernel, uptime, pending updates, whether a reboot is waiting, service state. Changes nothing. |
| `reboot` | Reboots devices one at a time and waits for each to come back healthy. |
| `maintenance` | For read-only devices only (experimental), see below. |

Use `--limit` with a device or a site group (`--limit campus_north`) and `--check --diff` to see what would change.

## Settings per site and per device

`slideshow_settings` takes the same keys as `server/config/frontend.config.js` and ends up in the device's `config.json`:

| Key | Meaning |
| --- | --- |
| `info.location` / `slideshow_location` | Name shown on screen, and used to find the weather position |
| `info.latitude`, `info.longitude`, `info.elevation` | Exact position for the weather (skips the name lookup) |
| `locale.language` | `de` or `en`: dates, texts, bundled quotes, facts and greetings |
| `locale.units` | `metric` (°C, km/h) or `imperial` (°F, mph) |
| `dailyView.*` | Show or hide `weather`, `nasa`, `quote`, `fact`, `greeting` |
| `branding.logo`, `branding.logoAlt` | Logo of the daily view |
| `schedule.*` | `onTime`, `offTime`, `days` (1 = Monday), `vacationPeriods` |
| `slideshow.defaultSlideDuration` | Milliseconds per slide |

Site values go in `group_vars`, device values in `host_vars`. Ansible *replaces* a dictionary that is defined at two levels, so use **`slideshow_settings_override`** in `host_vars`: it is merged on top of `slideshow_settings`, so a device lists only what differs:

```yaml
# group_vars/slideshow/main.yml        # host_vars/cafeteria-pi.yml
slideshow_settings:                    slideshow_settings_override:
  schedule:                              schedule:
    onTime: "07:30"                        onTime: "06:30"   # everything else is inherited
    offTime: "19:30"
```

Custom quotes, facts and greetings: set `slideshow_content_dir` to a folder on your machine (flat, or with `de/` and `en/` subfolders, same format as `server/data/`).

## Display modes

| `slideshow_display_mode` | Shows | Notes |
| --- | --- | --- |
| `browser` | Full daily view (clock, weather, NASA picture, quotes) plus media | Chromium inside `cage`. It is the heavy option, so prefer a Pi 4 or 5. |
| `mpv` | Images and videos only | Much lighter, the better choice for a Pi 3. |
| `none` | Nothing | Backend only, for a central server. |

### One central server, many displays

Run the backend on one machine (`slideshow_display_mode: none`, `slideshow_backend_host: 0.0.0.0`, `slideshow_backend_allowed_cidrs: [your VPN range]`) and let the Pis only display it:

```yaml
slideshow_backend_mode: remote
slideshow_backend_url: "https://slides.example.org"
slideshow_display_mode: mpv      # or browser
```

That syncs Google Drive once and keeps one config. Display devices then use the server's settings, including its schedule, so per-device schedules are not possible in this mode. The backend has **no login**: expose it only through a VPN or a reverse proxy that authenticates and uses TLS.

### Switching the screen off

Outside the schedule the page or player is already black. `slideshow_display_power_method` can also cut the screen itself:

| Method | Works with | Caveat |
| --- | --- | --- |
| `none` (default) | everything | The panel stays lit but black |
| `vcgencmd` | Pi 3/4 with the legacy display stack | Does nothing on the Pi 5 or full KMS |
| `wlr-randr` | `browser` mode if the compositor supports it | Not confirmed to work with `cage`; one Pi 5 report had the screen wake after 10 to 15 seconds |
| `cec` | TVs that obey HDMI-CEC | Monitors usually do not |
| `command` | anything | Your own `slideshow_display_power_on_command` and `..._off_command` |

Test the method on a real device before relying on it. A timer asks the backend every 30 seconds whether the screen should be on, so vacation periods and weekdays apply too, and the "on" signal is sent three times because some monitors ignore the first.

## Security model

What this setup does, and where it stops.

- **Nothing is exposed except SSH.** The backend listens on `127.0.0.1` and the firewall (nftables) drops everything else. Restrict SSH further with `slideshow_ssh_allowed_cidrs` and prefer a VPN (Tailscale or WireGuard) over opening SSH to the internet.
- **SSH is key-only.** Password login, root login and forwarding are off, and only `slideshow_admin_user` may log in. The role refuses to harden SSH unless at least one public key is configured, and it removes its own SSH config again if `sshd -t` rejects it. The firewall and SSH changes run **last**, so a failed run cannot leave a device half locked down.
- **Mind your own address.** If `slideshow_ssh_allowed_cidrs` does not include the network you run Ansible from, you lock yourself out of that device. Test on one device first.
- **No pulling from Git on the devices.** The devices hold no repository credentials and run nothing from a branch. You push changes from your machine, so compromising a repo or branch does not change your fleet by itself.
- **The code a device runs is pinned.** It downloads one release tarball and verifies its SHA-256. Set `slideshow_release_sha256` in your inventory so a device only ever runs the exact build you reviewed. Without it, the checksum published next to the release is used, which trusts the release account.
- **Least privilege.** The backend runs as its own user in a systemd sandbox (read-only system, no capabilities, restricted system calls) and only writes its media folder. The Google key is handed to it with `LoadCredential`, so only that process can read it. The kiosk user has a locked password and no shell. Chromium runs with its sandbox on, locked to the slideshow address by policy, with developer tools, downloads, printing and sign-in off. In browser mode `cage` runs without virtual-terminal switching.
- **Secrets are encrypted.** Keep them in Ansible Vault (or your own secret manager). The role never prints them (`no_log`) and writes them with mode `0600`.
- **Updates.** `slideshow_updates: security` (default) installs security updates automatically, including Chromium, kernel and firmware from the Raspberry Pi archive. These take effect after a reboot, so `slideshow_daily_reboot: "04:15"` applies them overnight. A hardware watchdog reboots a hung device.
- **What is not protected.** Someone with physical access can pull the SD card or plug in a keyboard. The app has no user accounts. Treat Wi-Fi credentials as secrets too.

## Updating

- **New app version:** change `slideshow_version` (and the checksum) in your inventory, then `ansible-playbook muddyblack.terminal_slideshow.update --limit canary`, check it, then run it for everything. Each device is health-checked before the next one starts.
- **Rolling back:** set the previous version again and re-run `update`. The last three releases stay on the device (`slideshow_keep_releases`), so no download is needed.
- **OS updates:** automatic for security fixes. For a full upgrade at a time you choose: `update -e upgrade_os=true --limit canary`.

## Read-only root (experimental)

`slideshow_readonly_root: true` runs the root filesystem as a read-only overlay, so every reboot restores a clean system and the SD card survives power cuts. Changes made at runtime (including automatic updates) are lost at reboot, so updates go through the `maintenance` playbook, which unlocks the device, applies everything and locks it again. The downloaded media would otherwise live in RAM, so it needs its own ext4 partition: set `slideshow_data_device`.

## What has and has not been tested

The role passes `ansible-lint` (production profile) and a syntax check. Its templates render correctly and the generated firewall, SSH config, systemd units and shell scripts pass `nft --check`, `sshd -t`, `systemd-analyze verify` and `shellcheck`. The release tarball boots standalone, and the MPV player was run against a real backend and a real `mpv` (playing images and a video with the right timings, and staying black when the schedule is off).

**Not yet run on a real Raspberry Pi:** the `cage`/Chromium start-up (the systemd session setup is the most likely thing to need a tweak), the MPV `drm` output, every screen power method, the read-only overlay, and the whole run end to end. Try it on one spare Pi before the fleet, and please report what you find.
