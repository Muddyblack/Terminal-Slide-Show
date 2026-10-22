# Setup guide: from a blank Raspberry Pi to a running display

This guide takes you through everything step by step. It works for **Raspberry Pi 3, 4 and 5** and for **Windows, macOS and Linux**. No prior knowledge is needed: a wizard asks the questions and sets everything up.

> Deutsche Version: [ANLEITUNG.md](ANLEITUNG.md)

## What you need

- One or more Raspberry Pis (3, 4 or 5), a power supply, a microSD card (16 GB or more) and a card reader
- A monitor or TV with HDMI
- Network for the Pi: cable or Wi-Fi (it needs internet on its first boot)
- A Google account (for the Drive folder with your images and videos)
- A PC running Windows 10/11, macOS or Linux

**Which model shows what?** A Pi 4 or 5 shows the full display with clock, weather, quotes and the picture of the day. A Pi 3 has only 1 GB of RAM, so it shows images and videos only (the lighter option). The wizard suggests the right one.

## Step 1: Prepare Google Drive

The display fetches images and videos from a Drive folder. For that you need a **service account** (an identity for programs).

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and create a project.
2. Enable the **Google Drive API** ("APIs & Services" → "Library").
3. Under "IAM & Admin" → "Service accounts", create a **service account**.
4. Open it → "Keys" → "Add key" → **JSON**. The file is downloaded. Keep it safe: anyone with it can read your folder.
5. Create a folder in Google Drive for the display and **share it with the service account's e-mail address** (it is `client_email` in the JSON file; "Viewer" is enough).
6. The **folder ID** is the last part of the address: `drive.google.com/drive/folders/`**`THIS-ID`**.

File names control when something is shown, for example `christmas_01-12@24-12.jpg` or `lunch_11h-13h_.jpg` (see the [README](../README.md)).

## Step 2: Install the tools on your PC

### Windows

On Windows the tool runs in **WSL2**, a Linux built into Windows. This is normal and a one-time setup.

1. Open **PowerShell as Administrator** and run:
   ```powershell
   wsl --install -d Ubuntu
   ```
2. Restart the PC if asked. Ubuntu then opens and asks for a user name and password (your choice).
3. In that Ubuntu window, install the programs and download the project (Ubuntu 24.04 or newer):
   ```bash
   sudo apt update
   sudo apt install -y ansible git mtools python3 openssh-client xz-utils
   git clone https://github.com/Muddyblack/Terminal-Slide-Show.git
   cd Terminal-Slide-Show
   ```
4. Also install **Raspberry Pi Imager** on Windows ([raspberrypi.com/software](https://www.raspberrypi.com/software/)). You use it later to write the finished file to the SD card.

### macOS

```bash
brew install ansible mtools
git clone https://github.com/Muddyblack/Terminal-Slide-Show.git
cd Terminal-Slide-Show
```
Raspberry Pi Imager is on [raspberrypi.com/software](https://www.raspberrypi.com/software/).

### Linux

```bash
sudo apt install -y ansible git mtools python3 openssh-client xz-utils    # Debian/Ubuntu
git clone https://github.com/Muddyblack/Terminal-Slide-Show.git
cd Terminal-Slide-Show
```
(On other distributions, install `ansible`, `git` and `mtools` with your package manager.)

## Step 3: Run the wizard

```bash
tools/slideshow-setup --lang en
```

It asks in order (Enter accepts the suggestion in brackets):

| Question | What to enter |
| --- | --- |
| Folder for the fleet | Where your settings should live (the suggestion is fine) |
| Place name | For example `Friedrichshafen`: shown on screen and decides the weather |
| Device names | For example `lobby-pi, canteen-pi` (lowercase letters, digits, hyphen) |
| Pi model per device | 3, 4 or 5 |
| User name | For managing over SSH (suggestion: `admin`) |
| SSH key | Found, or created if you want |
| Time zone | For example `Europe/Berlin` (matters for the on and off times) |
| Wi-Fi | Name, password and country (`DE`), or use a network cable |
| Drive folder ID and key file | From step 1 |
| NASA key | Optional, for the picture of the day ([api.nasa.gov](https://api.nasa.gov/)) |
| On and off time, days | When the display should run |
| Display language | `de` or `en` |
| Nightly reboot | Recommended: applies updates |
| SSH only from this network | For example your home network `192.168.1.0/24`. Enter = from anywhere (riskier) |

At the end it creates your fleet folder. **Your secrets (Google key, Wi-Fi password) are stored encrypted.** The password for that is created in `~/.config/slideshow-vault-pass`: **back this file up** (for example in your password manager). Without it you cannot get at the secrets again.

## Step 4: Create the SD card

At the end, the wizard asks whether to create the SD card for a device right away. You can also do it later.

### Linux: straight to the card

Insert the card and run:
```bash
tools/slideshow-sdcard --fleet ~/slideshow-fleet --host lobby-pi
```
The tool lists the removable disks and asks which one is the card. Before it erases anything, you have to type the device name. It never offers a disk that holds your system.

### Windows and macOS: a file first, then Imager

1. Create the image file (in WSL, or in the terminal):
   ```bash
   tools/slideshow-sdcard --fleet ~/slideshow-fleet --host lobby-pi --output ~/lobby-pi.img
   ```
   This downloads the Raspberry Pi operating system (about 500 MB), verifies it and puts all the settings into it.
2. **Windows:** copy the file from WSL to Windows, for example into Downloads:
   ```bash
   cp ~/lobby-pi.img /mnt/c/Users/YOURNAME/Downloads/
   ```
3. Open **Raspberry Pi Imager**. Under "Operating system" pick **"Use custom"** (at the bottom) and the file, under "Storage" your SD card, then write.
4. **Important:** if Imager offers to apply settings (user, Wi-Fi, etc.), decline ("No"). All settings are already in the file, and Imager would overwrite them. Labels vary a little between Imager versions.

> Until the first boot, the card (and the `.img` file) holds this device's secrets. Treat it like a key and delete the file after writing.

## Step 5: Start the Pi

1. Put the card in the Pi, connect the monitor and network, then power.
2. **Now wait 10 to 15 minutes.** The Pi sets itself up on its first boot (it downloads software from the internet) and then reboots. You do not have to do or type anything.
3. Then the display appears. The Pi now has a firewall, key-only SSH login and installs security updates automatically.

## Step 6: Manage it

Run these in the fleet folder (on Windows, in Ubuntu/WSL):

```bash
cd ~/slideshow-fleet
ansible-playbook muddyblack.terminal_slideshow.status      # state of all devices
ansible-playbook muddyblack.terminal_slideshow.site        # apply settings
ansible-playbook muddyblack.terminal_slideshow.reboot      # restart devices
```

- **Change settings** (times, place, language, widgets): `group_vars/slideshow/main.yml` for all devices, `host_vars/<name>.yml` for one, then run `site`. All options are in the [fleet documentation](../ansible/README.md#settings-per-site-and-per-device).
- **New program version:** change `slideshow_version` and run `muddyblack.terminal_slideshow.update`. It goes device by device and stops as soon as one is not healthy.
- **New device:** run the wizard again with a new folder, or add the device to `inventory.yml` and `host_vars/`.

**The Pi is not found?** In the fleet folder, `inventory.yml` has `ansible_host: name.local` for each device. In WSL2, `.local` names often do not work. Then enter the Pi's IP address (your router lists connected devices).

## If something goes wrong

| Problem | What you can do |
| --- | --- |
| Only a black screen after 20 minutes | The Pi probably had no internet on its first boot. Check the Wi-Fi details and write the card again. Over SSH you can see the progress with `sudo journalctl -u slideshow-firstboot` |
| Display stays black after startup | On the Pi, look at `sudo journalctl -u slideshow-backend -u slideshow-display` |
| No images | Is the Drive folder shared with the service account's e-mail? Is the folder ID right? |
| You cannot log in over SSH any more | The device has no password (on purpose). Write the card again with the tool |
| Wrong times | Check the time zone in `group_vars/slideshow/main.yml` (`slideshow_timezone`) |

## Good to know

- The tool that writes the card has **not yet been tested on a real SD card and a real Pi**, although its parts (the wizard, image creation, the configuration) have been checked. Try it with one Pi before you set up many, and report what you find.
- How security is built and what is not protected is in the [fleet documentation](../ansible/README.md#security-model).
