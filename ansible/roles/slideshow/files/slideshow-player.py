#!/usr/bin/env python3
"""MPV player for Terminal Slide Show.

Plays the media list of a Terminal Slide Show backend (local or on another
machine) in a fullscreen MPV, and shows a black screen outside the schedule.
Only the Python standard library and mpv are needed.

Environment:
  SLIDESHOW_URL               Backend base URL, e.g. http://127.0.0.1:3000
  SLIDESHOW_DEFAULT_DURATION  Seconds per image without its own duration (default 10)
  SLIDESHOW_MPV_ARGS          Extra mpv arguments
  SLIDESHOW_POLL_SECONDS      How often the schedule is checked (default 5)
"""

import json
import os
import select
import shlex
import socket
import subprocess
import sys
import time
import urllib.parse
import urllib.request

VIDEO_EXTENSIONS = {".mp4", ".webm", ".ogg"}
MAX_VIDEO_SECONDS = 3600  # safety net if a video never reports its end


def log(message):
    print(message, flush=True)


class Backend:
    def __init__(self, base_url):
        self.base_url = base_url.rstrip("/")

    def get_json(self, path):
        with urllib.request.urlopen(self.base_url + path, timeout=5) as response:
            return json.load(response)

    def is_active(self, previous):
        """Whether the display should be on. Keeps the previous answer if the backend is unreachable."""
        try:
            return bool(self.get_json("/api/display-state")["active"])
        except (OSError, ValueError, KeyError):
            return previous

    def media(self):
        """Playable items as (url, seconds or None, is_video)."""
        items = []
        for entry in self.get_json("/api/all-media"):
            if entry.get("isDynamicView") or not entry.get("name"):
                continue  # the daily view only exists in the browser
            name = entry["name"]
            url = f"{self.base_url}/media/{urllib.parse.quote(name)}"
            duration = entry.get("duration")
            is_video = os.path.splitext(name)[1].lower() in VIDEO_EXTENSIONS
            items.append((url, duration / 1000 if duration else None, is_video))
        return items


class Mpv:
    def __init__(self, extra_args, default_duration):
        runtime_dir = os.environ.get("XDG_RUNTIME_DIR", "/tmp")
        self.socket_path = os.path.join(runtime_dir, "slideshow-mpv.sock")
        self.default_duration = default_duration
        self.buffer = b""
        if os.path.exists(self.socket_path):
            os.unlink(self.socket_path)

        self.process = subprocess.Popen([
            "mpv", "--idle=yes", "--force-window=yes", "--fullscreen", "--no-audio",
            "--no-osc", "--no-input-default-bindings", "--no-terminal",
            "--background-color=#000000", "--image-display-duration=inf",
            "--input-ipc-server=" + self.socket_path, *extra_args,
        ])
        self.sock = self._connect()

    def _connect(self):
        for _ in range(100):
            if self.process.poll() is not None:
                raise RuntimeError(f"mpv exited with code {self.process.returncode}")
            try:
                sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
                sock.connect(self.socket_path)
                return sock
            except OSError:
                time.sleep(0.1)
        raise RuntimeError("mpv did not open its control socket")

    def command(self, *args):
        self.sock.sendall(json.dumps({"command": list(args)}).encode() + b"\n")

    def events(self, timeout):
        """Events received within `timeout` seconds."""
        found = []
        if select.select([self.sock], [], [], max(timeout, 0))[0]:
            chunk = self.sock.recv(65536)
            if not chunk:
                raise RuntimeError("mpv closed the control socket")
            self.buffer += chunk
        while b"\n" in self.buffer:
            line, self.buffer = self.buffer.split(b"\n", 1)
            try:
                message = json.loads(line)
            except ValueError:
                continue
            if "event" in message:
                found.append(message)
        return found

    def wait_for(self, name, deadline, tick=None):
        """Wait for an event, calling `tick` about once a second. Returns False on timeout or if tick is falsy."""
        while time.monotonic() < deadline:
            for event in self.events(min(1.0, deadline - time.monotonic())):
                if event["event"] == name:
                    return True
            if tick is not None and not tick():
                return False
        return False

    def play(self, url, seconds, is_video, tick):
        """Plays one item. Returns False if playback was interrupted (e.g. schedule off)."""
        log(f"Showing {url}")
        self.command("set_property", "loop-file", "no")
        self.command("loadfile", url, "replace")
        if not self.wait_for("start-file", time.monotonic() + 15):
            log(f"Could not start {url}")
            return True

        if is_video:
            limit = seconds or MAX_VIDEO_SECONDS
            self.wait_for("end-file", time.monotonic() + limit, tick)
        else:
            # Images and GIFs: mpv holds them forever, so the timer decides
            self.command("set_property", "loop-file", "inf")
            deadline = time.monotonic() + (seconds or self.default_duration)
            while time.monotonic() < deadline:
                self.events(min(1.0, deadline - time.monotonic()))
                if not tick():
                    return False
        return tick()

    def stop(self):
        self.command("stop")

    def close(self):
        self.process.terminate()


def main():
    base_url = os.environ.get("SLIDESHOW_URL")
    if not base_url:
        sys.exit("SLIDESHOW_URL is not set")

    default_duration = float(os.environ.get("SLIDESHOW_DEFAULT_DURATION", "10"))
    poll = float(os.environ.get("SLIDESHOW_POLL_SECONDS", "5"))
    backend = Backend(base_url)
    mpv = Mpv(shlex.split(os.environ.get("SLIDESHOW_MPV_ARGS", "")), default_duration)

    active = True
    last_check = 0.0

    def tick():
        """Checks the schedule every `poll` seconds. Returns False if the display should be off."""
        nonlocal active, last_check
        if time.monotonic() - last_check >= poll:
            last_check = time.monotonic()
            active = backend.is_active(active)
        return active

    log(f"Playing {base_url}")
    try:
        while True:
            if not tick():
                mpv.stop()  # black screen
                time.sleep(poll)
                continue

            try:
                items = backend.media()
            except (OSError, ValueError) as error:
                log(f"Backend not reachable: {error}")
                time.sleep(poll)
                continue

            if not items:
                time.sleep(poll)
                continue

            for url, seconds, is_video in items:
                if not mpv.play(url, seconds, is_video, tick):
                    break
            else:
                continue
            mpv.stop()
    finally:
        mpv.close()


if __name__ == "__main__":
    main()
