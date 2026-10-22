# Anleitung: Vom leeren Raspberry Pi zur laufenden Anzeige

Diese Anleitung führt dich Schritt für Schritt durch alles. Sie funktioniert für **Raspberry Pi 3, 4 und 5** und für **Windows, macOS und Linux**. Du brauchst keine Vorkenntnisse; ein Assistent stellt dir die Fragen und legt alles an.

> English version: [SETUP.md](SETUP.md)

## Was du brauchst

- Einen oder mehrere Raspberry Pi (3, 4 oder 5), Netzteil, microSD-Karte (mindestens 16 GB) und einen Kartenleser
- Einen Monitor oder Fernseher mit HDMI
- Netzwerk für den Pi: Kabel oder WLAN (der Pi braucht beim ersten Start Internet)
- Einen Google-Account (für den Drive-Ordner mit deinen Bildern und Videos)
- Einen PC mit Windows 10/11, macOS oder Linux

**Welches Modell zeigt was?** Ein Pi 4 oder 5 zeigt die volle Anzeige mit Uhr, Wetter, Zitaten und Bild des Tages. Ein Pi 3 hat nur 1 GB Arbeitsspeicher und zeigt deshalb nur Bilder und Videos (das ist die leichtere Variante). Der Assistent schlägt das passend vor.

## Schritt 1: Google Drive vorbereiten

Die Anzeige holt Bilder und Videos aus einem Drive-Ordner. Dafür brauchst du einen **Service-Account** (ein Zugang für Programme).

1. Öffne die [Google Cloud Console](https://console.cloud.google.com/) und lege ein Projekt an.
2. Aktiviere dort die **Google Drive API** („APIs & Dienste“ → „Bibliothek“).
3. Lege unter „IAM & Verwaltung“ → „Dienstkonten“ ein **Dienstkonto** an.
4. Öffne das Dienstkonto → „Schlüssel“ → „Schlüssel hinzufügen“ → **JSON**. Die Datei wird heruntergeladen. Bewahre sie sicher auf; wer sie hat, kann deinen Ordner lesen.
5. Lege in Google Drive einen Ordner für die Anzeige an und **gib ihn für die E-Mail-Adresse des Dienstkontos frei** (steht in der JSON-Datei als `client_email`; „Betrachter“ reicht).
6. Die **Ordner-ID** ist der letzte Teil der Adresse: `drive.google.com/drive/folders/`**`DIESE-ID`**.

Dateinamen steuern, wann etwas erscheint, zum Beispiel `weihnachten_01-12@24-12.jpg` oder `mittag_11h-13h_.jpg` (siehe die [README](../README.md)).

## Schritt 2: Werkzeuge auf dem PC installieren

### Windows

Auf Windows läuft das Werkzeug in **WSL2**, einem Linux, das in Windows eingebaut ist. Das ist normal und einmalig.

1. Öffne **PowerShell als Administrator** und gib ein:
   ```powershell
   wsl --install -d Ubuntu
   ```
2. Starte den PC neu, wenn du dazu aufgefordert wirst. Danach öffnet sich Ubuntu und fragt nach einem Benutzernamen und Passwort (frei wählbar).
3. Installiere in diesem Ubuntu-Fenster die Programme und lade das Projekt herunter (Ubuntu 24.04 oder neuer):
   ```bash
   sudo apt update
   sudo apt install -y ansible git mtools python3 openssh-client xz-utils
   git clone https://github.com/Muddyblack/Terminal-Slide-Show.git
   cd Terminal-Slide-Show
   ```
4. Installiere außerdem den **Raspberry Pi Imager** unter Windows ([raspberrypi.com/software](https://www.raspberrypi.com/software/)). Mit ihm schreibst du die fertige Datei später auf die SD-Karte.

### macOS

```bash
brew install ansible mtools
git clone https://github.com/Muddyblack/Terminal-Slide-Show.git
cd Terminal-Slide-Show
```
Den Raspberry Pi Imager gibt es auf [raspberrypi.com/software](https://www.raspberrypi.com/software/).

### Linux

```bash
sudo apt install -y ansible git mtools python3 openssh-client xz-utils    # Debian/Ubuntu
git clone https://github.com/Muddyblack/Terminal-Slide-Show.git
cd Terminal-Slide-Show
```
(Bei anderen Distributionen: `ansible`, `git` und `mtools` über den Paketmanager installieren.)

## Schritt 3: Den Assistenten starten

```bash
tools/slideshow-setup
```

Er fragt dich der Reihe nach (Enter übernimmt den Vorschlag in Klammern):

| Frage | Was du eingibst |
| --- | --- |
| Ordner für die Flotte | Wo deine Einstellungen liegen sollen (Vorschlag passt) |
| Ortsname | Zum Beispiel `Friedrichshafen`: erscheint auf dem Bildschirm und bestimmt das Wetter |
| Namen der Geräte | Zum Beispiel `lobby-pi, mensa-pi` (nur Kleinbuchstaben, Zahlen, Bindestrich) |
| Pi-Modell je Gerät | 3, 4 oder 5 |
| Benutzername | Für die Verwaltung per SSH (Vorschlag `admin`) |
| SSH-Schlüssel | Wird gefunden oder auf Wunsch angelegt |
| Zeitzone | Zum Beispiel `Europe/Berlin` (wichtig für die Ein- und Ausschaltzeiten) |
| WLAN | Name, Passwort und Land (`DE`), oder Netzwerkkabel verwenden |
| Drive-Ordner-ID und Schlüsseldatei | Aus Schritt 1 |
| NASA-Schlüssel | Optional, für das Bild des Tages ([api.nasa.gov](https://api.nasa.gov/)) |
| Ein- und Ausschaltzeit, Tage | Wann die Anzeige laufen soll |
| Sprache der Anzeige | `de` oder `en` |
| Nächtlicher Neustart | Empfohlen: wendet Updates an |
| SSH nur aus diesem Netz | Zum Beispiel dein Heimnetz `192.168.1.0/24`. Enter = von überall (riskanter) |

Am Ende legt er deinen Flotten-Ordner an. **Deine Geheimnisse (Google-Schlüssel, WLAN-Passwort) werden verschlüsselt gespeichert.** Das dazu erzeugte Passwort liegt in `~/.config/slideshow-vault-pass`: **sichere diese Datei** (zum Beispiel in deinem Passwortmanager). Ohne sie kommst du nicht mehr an die Geheimnisse.

## Schritt 4: Die SD-Karte erstellen

Der Assistent fragt am Ende, ob er die SD-Karte für ein Gerät gleich erstellen soll. Du kannst das auch später machen.

### Linux: direkt auf die Karte

Karte einstecken und:
```bash
tools/slideshow-sdcard --fleet ~/slideshow-flotte --host lobby-pi
```
Das Werkzeug zeigt dir die Wechseldatenträger und fragt, welcher die Karte ist. Bevor es etwas löscht, musst du den Gerätenamen eintippen. Eine Festplatte mit deinem System bietet es nie an.

### Windows und macOS: erst eine Datei, dann der Imager

1. Erstelle die Image-Datei (in WSL bzw. im Terminal):
   ```bash
   tools/slideshow-sdcard --fleet ~/slideshow-flotte --host lobby-pi --output ~/lobby-pi.img
   ```
   Das lädt das Raspberry-Pi-Betriebssystem (rund 500 MB), prüft es und legt alle Einstellungen hinein.
2. **Windows:** Kopiere die Datei aus WSL nach Windows, zum Beispiel in die Downloads:
   ```bash
   cp ~/lobby-pi.img /mnt/c/Users/DEINNAME/Downloads/
   ```
3. Öffne den **Raspberry Pi Imager**. Wähle bei „Betriebssystem“ ganz unten **„Eigenes Image verwenden“** und die Datei, bei „Speicher“ deine SD-Karte, dann schreiben.
4. **Wichtig:** Wenn der Imager anbietet, Einstellungen (Benutzer, WLAN usw.) anzuwenden, lehne das ab („Nein“). Alle Einstellungen sind bereits in der Datei, und der Imager würde sie überschreiben. Die Bezeichnungen können je nach Imager-Version etwas abweichen.

> Die Karte (und die `.img`-Datei) enthält bis zum ersten Start die Geheimnisse dieses Geräts. Behandle sie wie einen Schlüssel und lösche die Datei nach dem Schreiben.

## Schritt 5: Den Pi starten

1. Karte in den Pi, Monitor und Netzwerk anschließen, dann den Strom.
2. **Jetzt 10 bis 15 Minuten warten.** Der Pi richtet sich beim ersten Start selbst ein (er lädt dabei Programme aus dem Internet) und startet danach neu. Du musst nichts tun und nichts eingeben.
3. Danach erscheint die Anzeige. Der Pi hat jetzt eine Firewall, nur Schlüssel-Login per SSH und installiert Sicherheitsupdates automatisch.

## Schritt 6: Verwalten

Alle Befehle gibst du im Flotten-Ordner ein (unter Windows in Ubuntu/WSL):

```bash
cd ~/slideshow-flotte
ansible-playbook muddyblack.terminal_slideshow.status      # Zustand aller Geräte
ansible-playbook muddyblack.terminal_slideshow.site        # Einstellungen anwenden
ansible-playbook muddyblack.terminal_slideshow.reboot      # Geräte neu starten
```

- **Einstellungen ändern** (Zeiten, Ort, Sprache, Widgets): Datei `group_vars/slideshow/main.yml` für alle, `host_vars/<name>.yml` für ein Gerät, danach `site` ausführen. Alle Möglichkeiten stehen in der [Flotten-Dokumentation](../ansible/README.md#settings-per-site-and-per-device).
- **Neue Programmversion:** `slideshow_version` ändern und `muddyblack.terminal_slideshow.update` ausführen. Das läuft Gerät für Gerät und stoppt, sobald eines nicht mehr gesund ist.
- **Neues Gerät:** den Assistenten mit einem neuen Ordner erneut starten, oder das Gerät in `inventory.yml` und `host_vars/` ergänzen.

**Der Pi wird nicht gefunden?** Im Flotten-Ordner steht in `inventory.yml` bei jedem Gerät `ansible_host: name.local`. In WSL2 funktionieren `.local`-Namen oft nicht. Dann trage die IP-Adresse des Pi ein (steht im Router unter den verbundenen Geräten).

## Wenn etwas nicht klappt

| Problem | Was du tun kannst |
| --- | --- |
| Nach 20 Minuten nur ein schwarzer Bildschirm | Der Pi hatte wohl kein Internet beim ersten Start. WLAN-Daten prüfen und die Karte neu schreiben. Per SSH siehst du den Stand mit `sudo journalctl -u slideshow-firstboot` |
| Anzeige bleibt nach dem Start schwarz | `sudo journalctl -u slideshow-backend -u slideshow-display` auf dem Pi ansehen |
| Keine Bilder | Ist der Drive-Ordner für die E-Mail-Adresse des Dienstkontos freigegeben? Stimmt die Ordner-ID? |
| Du kommst per SSH nicht mehr rein | Das Gerät hat kein Passwort (Absicht). Schreibe die Karte mit dem Werkzeug neu |
| Zeiten stimmen nicht | Zeitzone in `group_vars/slideshow/main.yml` prüfen (`slideshow_timezone`) |

## Gut zu wissen

- Das Werkzeug zum Beschreiben der Karte wurde bisher **nicht auf einer echten SD-Karte und einem echten Pi getestet**; die Einzelteile (Assistent, Image-Erstellung, Konfiguration) wurden aber geprüft. Probiere es zuerst mit einem Pi aus, bevor du viele einrichtest, und melde, was auffällt.
- Wie die Sicherheit aufgebaut ist und was nicht geschützt ist, steht in der [Flotten-Dokumentation](../ansible/README.md#security-model).
