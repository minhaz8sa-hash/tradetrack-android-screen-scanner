import io
import threading
import time
import uuid
from datetime import datetime
import tkinter as tk
from tkinter import ttk

import mss
import requests
from PIL import Image

ENDPOINT = "https://base44.app/api/apps/6a1d6d69aab915d09b7b082d/functions/analyzeMobileScreenCapture"
APP_ID = "6a1d6d69aab915d09b7b082d"
VERSION = "1.0.1"


class TradeTrackWindowsScanner:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("TradeTrack Live Windows Scanner")
        self.root.geometry("620x520")
        self.root.minsize(560, 480)
        self.root.configure(bg="#0e1117")
        self.root.protocol("WM_DELETE_WINDOW", self.close_app)

        self.lock = threading.RLock()
        self.session = self.make_session()
        self.failure_count = 0
        self.last_error = ""

        self.sharing = False
        self.armed = False
        self.analyzing = False
        self.scan_session_id = ""
        self.scan_attempt = 0
        self.estimated_close_ms = 0
        self.held_candidate_ready = False
        self.held_direction = ""
        self.held_up = 50
        self.held_down = 50
        self.held_instability = 100
        self.held_source_seconds = -1.0
        self.held_asset = "—"
        self.held_payout = 0

        self.overlay = None
        self.overlay_label = None
        self.drag_start = None
        self.drag_origin = None
        self.drag_moved = False

        self.monitor_labels = []
        self.monitor_indices = []
        self.monitor_var = tk.StringVar()
        self.status_var = tk.StringVar(value="Ready — screen sharing is off")
        self.detail_var = tk.StringVar(value="No scan running.")

        self.build_ui()
        self.refresh_monitors()

    def make_session(self):
        session = requests.Session()
        session.headers.update({
            "User-Agent": f"TradeTrackWindowsScanner/{VERSION}",
            "Connection": "close",
        })
        return session

    def reset_session(self):
        try:
            self.session.close()
        except Exception:
            pass
        self.session = self.make_session()

    def retry_profile(self, exc):
        message = str(exc or "Unknown scanner error")
        lower = message.lower()
        if "429" in lower or "too many" in lower or "rate" in lower:
            return 8.0, "SERVER BUSY\nRETRY 8s"
        if "timeout" in lower or "timed out" in lower:
            return 5.0, "NETWORK\nRETRY 5s"
        if "connection" in lower or "dns" in lower or "name resolution" in lower:
            return 4.0, "NETWORK\nRETRY 4s"
        if "http 5" in lower or "server" in lower or "temporar" in lower:
            return 5.0, "SERVER\nRETRY 5s"
        if "capture" in lower or "display" in lower:
            return 2.0, "CAPTURE\nRETRY 2s"
        return 3.0, "RETRYING\nSCAN"

    def build_ui(self):
        header = tk.Frame(self.root, bg="#0e1117")
        header.pack(fill="x", padx=24, pady=(24, 10))

        tk.Label(
            header,
            text="TradeTrack Live Windows Scanner",
            font=("Segoe UI", 22, "bold"),
            fg="#f8fafc",
            bg="#0e1117",
        ).pack(anchor="w")

        tk.Label(
            header,
            text="Phone-style screen sharing → floating TT SCAN → NEXT candle signal",
            font=("Segoe UI", 10),
            fg="#94a3b8",
            bg="#0e1117",
        ).pack(anchor="w", pady=(4, 0))

        card = tk.Frame(self.root, bg="#151a23", highlightthickness=1, highlightbackground="#273244")
        card.pack(fill="x", padx=24, pady=10)

        tk.Label(
            card,
            text="Screen Share",
            font=("Segoe UI", 12, "bold"),
            fg="#f8fafc",
            bg="#151a23",
        ).pack(anchor="w", padx=18, pady=(16, 5))

        tk.Label(
            card,
            text="No browser extension, token, asset, or payout input is required. Keep Quotex visible on the selected display.",
            font=("Segoe UI", 9),
            fg="#94a3b8",
            bg="#151a23",
            wraplength=540,
            justify="left",
        ).pack(anchor="w", padx=18, pady=(0, 12))

        row = tk.Frame(card, bg="#151a23")
        row.pack(fill="x", padx=18, pady=(0, 12))

        tk.Label(row, text="Display", font=("Segoe UI", 9, "bold"), fg="#cbd5e1", bg="#151a23").pack(anchor="w")
        self.monitor_combo = ttk.Combobox(row, textvariable=self.monitor_var, state="readonly")
        self.monitor_combo.pack(fill="x", pady=(5, 0))

        buttons = tk.Frame(card, bg="#151a23")
        buttons.pack(fill="x", padx=18, pady=(0, 18))

        self.start_btn = tk.Button(
            buttons,
            text="Start Screen Share + Floating TT Scan",
            command=self.start_screen_share,
            bg="#34d399",
            fg="#06251c",
            activebackground="#2fc78f",
            activeforeground="#06251c",
            relief="flat",
            font=("Segoe UI", 10, "bold"),
            padx=12,
            pady=11,
        )
        self.start_btn.pack(fill="x")

        self.stop_btn = tk.Button(
            buttons,
            text="Stop Screen Share",
            command=self.stop_screen_share,
            bg="#223044",
            fg="#f8fafc",
            activebackground="#2d3d54",
            activeforeground="#f8fafc",
            relief="flat",
            font=("Segoe UI", 10, "bold"),
            padx=12,
            pady=9,
        )
        self.stop_btn.pack(fill="x", pady=(8, 0))

        status = tk.Frame(self.root, bg="#151a23", highlightthickness=1, highlightbackground="#273244")
        status.pack(fill="x", padx=24, pady=10)

        tk.Label(status, text="Status", font=("Segoe UI", 10, "bold"), fg="#f8fafc", bg="#151a23").pack(
            anchor="w", padx=18, pady=(14, 4)
        )
        tk.Label(
            status,
            textvariable=self.status_var,
            font=("Segoe UI", 10, "bold"),
            fg="#34d399",
            bg="#151a23",
            wraplength=540,
            justify="left",
        ).pack(anchor="w", padx=18)
        tk.Label(
            status,
            textvariable=self.detail_var,
            font=("Segoe UI", 9),
            fg="#94a3b8",
            bg="#151a23",
            wraplength=540,
            justify="left",
        ).pack(anchor="w", padx=18, pady=(5, 14))

        instructions = tk.Frame(self.root, bg="#0e1117")
        instructions.pack(fill="x", padx=24, pady=(8, 0))

        text = (
            "How to use:\n"
            "1. Start Screen Share once.\n"
            "2. Open Quotex and keep the chart visible on the selected display.\n"
            "3. Tap the floating TT SCAN around T-50…T-30.\n"
            "4. It keeps capturing/verifying the running candle and shows the NEXT-candle result near T-5…T-2.\n"
            "5. Drag TT SCAN to move it. Right-click it to reopen this window."
        )
        tk.Label(
            instructions,
            text=text,
            font=("Segoe UI", 9),
            fg="#94a3b8",
            bg="#0e1117",
            justify="left",
            wraplength=560,
        ).pack(anchor="w")

        tk.Label(
            self.root,
            text=f"Windows native screen capture • v{VERSION}",
            font=("Segoe UI", 8),
            fg="#64748b",
            bg="#0e1117",
        ).pack(side="bottom", pady=12)

    def refresh_monitors(self):
        labels = []
        indices = []
        with mss.mss() as sct:
            for i, mon in enumerate(sct.monitors[1:], start=1):
                labels.append(f"Display {i} — {mon['width']}×{mon['height']} @ {mon['left']},{mon['top']}")
                indices.append(i)
        self.monitor_labels = labels
        self.monitor_indices = indices
        self.monitor_combo["values"] = labels
        if labels:
            self.monitor_var.set(labels[0])

    def selected_monitor_index(self):
        try:
            idx = self.monitor_labels.index(self.monitor_var.get())
            return self.monitor_indices[idx]
        except Exception:
            return 1

    def ui(self, fn):
        try:
            self.root.after(0, fn)
        except Exception:
            pass

    def ui_sync(self, fn, timeout=2.0):
        event = threading.Event()

        def wrapped():
            try:
                fn()
            finally:
                event.set()

        self.ui(wrapped)
        event.wait(timeout)

    def set_status(self, status, detail=None):
        def apply():
            self.status_var.set(status)
            if detail is not None:
                self.detail_var.set(detail)
        self.ui(apply)

    def start_screen_share(self):
        with self.lock:
            if self.sharing:
                self.root.iconify()
                return
            self.sharing = True
        self.create_overlay()
        self.status_var.set("Screen share active — floating TT SCAN is ready")
        self.detail_var.set("Open Quotex on the selected display, then tap TT SCAN around T-50…T-30.")
        self.root.iconify()

    def stop_screen_share(self):
        with self.lock:
            self.sharing = False
            self.armed = False
            self.analyzing = False
            self.scan_session_id = ""
        if self.overlay is not None:
            try:
                self.overlay.destroy()
            except Exception:
                pass
            self.overlay = None
            self.overlay_label = None
        self.status_var.set("Ready — screen sharing is off")
        self.detail_var.set("No scan running.")

    def create_overlay(self):
        if self.overlay is not None:
            return
        overlay = tk.Toplevel(self.root)
        overlay.overrideredirect(True)
        overlay.attributes("-topmost", True)
        overlay.configure(bg="#0d3227")
        overlay.geometry(f"124x92+{max(20, self.root.winfo_screenwidth()-160)}+190")

        label = tk.Label(
            overlay,
            text="TT\nSCAN",
            font=("Segoe UI", 13, "bold"),
            fg="white",
            bg="#0d3227",
            bd=1,
            relief="solid",
            padx=8,
            pady=8,
            cursor="hand2",
        )
        label.pack(fill="both", expand=True)

        label.bind("<ButtonPress-1>", self.on_overlay_press)
        label.bind("<B1-Motion>", self.on_overlay_drag)
        label.bind("<ButtonRelease-1>", self.on_overlay_release)
        label.bind("<Button-3>", lambda _e: self.restore_main())

        self.overlay = overlay
        self.overlay_label = label

    def restore_main(self):
        try:
            self.root.deiconify()
            self.root.lift()
            self.root.focus_force()
        except Exception:
            pass

    def on_overlay_press(self, event):
        if self.overlay is None:
            return
        self.drag_start = (event.x_root, event.y_root)
        self.drag_origin = (self.overlay.winfo_x(), self.overlay.winfo_y())
        self.drag_moved = False

    def on_overlay_drag(self, event):
        if not self.drag_start or not self.drag_origin or self.overlay is None:
            return
        dx = event.x_root - self.drag_start[0]
        dy = event.y_root - self.drag_start[1]
        if abs(dx) > 4 or abs(dy) > 4:
            self.drag_moved = True
        x = self.drag_origin[0] + dx
        y = self.drag_origin[1] + dy
        self.overlay.geometry(f"+{x}+{y}")

    def on_overlay_release(self, _event):
        if not self.drag_moved:
            self.toggle_scan()

    def set_bubble(self, text, kind="normal"):
        colors = {
            "normal": "#0d3227",
            "signal": "#064e3b",
            "warn": "#5b3a09",
            "error": "#5f1820",
        }
        bg = colors.get(kind, colors["normal"])

        def apply():
            if self.overlay is None or self.overlay_label is None:
                return
            try:
                self.overlay.deiconify()
                self.overlay.attributes("-topmost", True)
                self.overlay_label.configure(text=text, bg=bg)
                self.overlay.configure(bg=bg)
            except Exception:
                pass

        self.ui(apply)

    def toggle_scan(self):
        with self.lock:
            if not self.sharing:
                return
            if self.armed:
                self.cancel_scan()
                return
        self.arm_scan()

    def arm_scan(self):
        with self.lock:
            self.armed = True
            self.analyzing = False
            self.scan_attempt = 0
            self.failure_count = 0
            self.last_error = ""
            self.scan_session_id = str(uuid.uuid4())
            self.estimated_close_ms = 0
            self.held_candidate_ready = False
            self.held_direction = ""
            self.held_up = 50
            self.held_down = 50
            self.held_instability = 100
            self.held_source_seconds = -1.0
            self.held_asset = "—"
            self.held_payout = 0

        self.set_bubble("ARMED\nSCANNING")
        self.set_status("Scanner armed — analyzing running candle", "Signal target: NEXT candle.")
        threading.Thread(target=self.final_window_watcher, daemon=True).start()
        threading.Thread(target=self.scan_loop, daemon=True).start()

    def cancel_scan(self):
        with self.lock:
            self.armed = False
            self.analyzing = False
            self.scan_session_id = ""
            self.estimated_close_ms = 0
            self.held_candidate_ready = False
        self.set_bubble("TT\nSCAN")
        self.set_status("Screen share active — scan cancelled", "Tap TT SCAN when you want to arm another candle.")

    def final_window_watcher(self):
        while True:
            with self.lock:
                if not self.armed:
                    return
                close_ms = self.estimated_close_ms
                held = self.held_candidate_ready
                held_source = self.held_source_seconds
            if close_ms > 0:
                remaining = close_ms - (time.time() * 1000.0)
                if 2000 <= remaining <= 5000 and held and 0 <= held_source <= 15:
                    self.release_held_signal()
                    return
                if remaining < 2000:
                    self.finish_no_trade("No fresh stable next-candle confirmation before close.")
                    return
            time.sleep(0.2)

    def scan_loop(self):
        while True:
            with self.lock:
                if not self.armed or not self.sharing:
                    return
                if self.analyzing:
                    time.sleep(0.1)
                    continue
                self.analyzing = True
                self.scan_attempt += 1
                attempt = self.scan_attempt
                session_id = self.scan_session_id
                mode = "full" if attempt == 1 else "verify"

            self.set_bubble(f"CAPTURING\n{attempt}")
            try:
                frames, width, height, interval_ms = self.capture_frames(mode)
                with self.lock:
                    if not self.armed or session_id != self.scan_session_id:
                        self.analyzing = False
                        return
                self.set_bubble("ANALYZING\nNEXT")
                result = self.post_frames(frames, width, height, interval_ms, session_id, mode)
                scan = result.get("scan") or {}
                if not scan:
                    raise RuntimeError(result.get("error") or "No scan result")

                with self.lock:
                    self.failure_count = 0
                    self.last_error = ""

                delay = self.process_scan(scan)

            except Exception as exc:
                with self.lock:
                    self.analyzing = False
                    still_armed = self.armed
                    self.failure_count += 1
                    failures = self.failure_count
                    self.last_error = str(exc)

                if not still_armed:
                    return

                retry_delay, retry_text = self.retry_profile(exc)

                # Recreate the HTTP session after repeated failures so a stale
                # keep-alive/socket cannot trap the scanner in RETRYING forever.
                if failures >= 2:
                    self.reset_session()

                if failures >= 6:
                    with self.lock:
                        self.armed = False
                        self.analyzing = False
                        self.scan_session_id = ""
                    self.set_bubble("SCAN ERROR\nTAP AGAIN", "error")
                    self.set_status(
                        "Scan stopped after repeated errors",
                        f"{exc} — connection was reset. Tap TT SCAN again after checking internet/Quotex.",
                    )
                    return

                self.set_bubble(retry_text, "warn")
                self.set_status(
                    f"Scanner retrying ({failures}/6)",
                    f"{exc} — automatic retry in {int(retry_delay)}s.",
                )
                delay = retry_delay

            with self.lock:
                self.analyzing = False
                still_armed = self.armed
            if not still_armed:
                return
            if delay is None:
                return
            time.sleep(delay)

    def capture_frames(self, mode):
        target_frames = 3 if mode == "full" else 1
        frame_interval = 0.75 if mode == "full" else 0.0
        max_width = 900 if mode == "full" else 720
        quality = 78 if mode == "full" else 70
        monitor_index = self.selected_monitor_index()

        self.ui_sync(lambda: self.overlay.withdraw() if self.overlay is not None else None)
        time.sleep(0.14)

        frames = []
        out_width = 0
        out_height = 0

        try:
            with mss.mss() as sct:
                monitors = sct.monitors
                if monitor_index >= len(monitors):
                    monitor_index = 1
                mon = monitors[monitor_index]

                for i in range(target_frames):
                    if i > 0:
                        time.sleep(frame_interval)
                    shot = sct.grab(mon)
                    image = Image.frombytes("RGB", shot.size, shot.rgb)

                    top = max(0, round(image.height * 0.065))
                    bottom = max(0, round(image.height * 0.015))
                    crop_bottom = max(top + 1, image.height - bottom)
                    image = image.crop((0, top, image.width, crop_bottom))

                    if image.width > max_width:
                        ratio = max_width / float(image.width)
                        image = image.resize((max_width, max(1, round(image.height * ratio))), Image.Resampling.LANCZOS)

                    out_width, out_height = image.size
                    buf = io.BytesIO()
                    image.save(buf, format="JPEG", quality=quality, optimize=True)
                    frames.append(buf.getvalue())
        finally:
            self.ui_sync(self._show_overlay_after_capture)

        if not frames:
            raise RuntimeError("Unable to capture the selected Windows display.")
        return frames, out_width, out_height, int(frame_interval * 1000)

    def _show_overlay_after_capture(self):
        if self.overlay is not None:
            try:
                self.overlay.deiconify()
                self.overlay.attributes("-topmost", True)
            except Exception:
                pass

    def post_frames(self, frames, width, height, interval_ms, session_id, mode):
        data = {
            "capturedAt": datetime.utcnow().isoformat(timespec="milliseconds") + "Z",
            "imageWidth": str(width),
            "imageHeight": str(height),
            "frameIntervalMs": str(interval_ms),
            "scanSessionId": session_id,
            "analysisMode": mode,
        }
        names = ["frame", "frame2", "frame3"]
        files = {}
        for i, frame in enumerate(frames[:3]):
            files[names[i]] = (f"windows-screen-{i+1}.jpg", frame, "image/jpeg")

        try:
            response = self.session.post(
                ENDPOINT,
                headers={"X-App-Id": APP_ID},
                data=data,
                files=files,
                timeout=(12, 60),
            )
        except requests.exceptions.Timeout as exc:
            raise RuntimeError("Network timeout while waiting for screen analysis") from exc
        except requests.exceptions.ConnectionError as exc:
            raise RuntimeError("Network connection error while sending screen capture") from exc
        except requests.exceptions.RequestException as exc:
            raise RuntimeError(f"Network request failed: {exc}") from exc

        try:
            payload = response.json()
        except Exception:
            raise RuntimeError(f"Invalid server response (HTTP {response.status_code})")

        if response.status_code == 429:
            raise RuntimeError(payload.get("error") or "HTTP 429 — analysis service rate limit")
        if response.status_code >= 500:
            raise RuntimeError(payload.get("error") or f"HTTP {response.status_code} — analysis server temporarily unavailable")
        if not response.ok or not payload.get("success"):
            raise RuntimeError(payload.get("error") or f"HTTP {response.status_code}")
        return payload

    def process_scan(self, scan):
        try:
            source_seconds = float(scan.get("secondsToCandleClose"))
        except Exception:
            source_seconds = -1.0

        try:
            up = round(float(scan.get("upConfirmation", 50)))
        except Exception:
            up = 50
        try:
            down = round(float(scan.get("downConfirmation", 50)))
        except Exception:
            down = 50
        try:
            instability = round(float(scan.get("endInstabilityScore", 100)))
        except Exception:
            instability = 100

        candidate_ready = bool(scan.get("candidateReady", False))
        direction = str(scan.get("candidateDirection", "SKIP")).upper()
        bias_state = str(scan.get("biasState", "SCANNING")).upper()
        asset = str(scan.get("asset", "—"))
        try:
            payout = round(float(scan.get("payout", 0)))
        except Exception:
            payout = 0

        close_at = str(scan.get("estimatedCandleCloseAt") or "")
        parsed_close_ms = 0
        if close_at:
            try:
                parsed_close_ms = datetime.fromisoformat(close_at.replace("Z", "+00:00")).timestamp() * 1000.0
            except Exception:
                parsed_close_ms = 0

        with self.lock:
            if parsed_close_ms > time.time() * 1000.0:
                self.estimated_close_ms = parsed_close_ms

            if candidate_ready and direction in ("UP", "DOWN") and instability <= 45:
                self.held_candidate_ready = True
                self.held_direction = direction
                self.held_up = up
                self.held_down = down
                self.held_instability = instability
                self.held_source_seconds = source_seconds
                self.held_asset = asset
                self.held_payout = payout
            elif 0 <= source_seconds <= 15:
                self.held_candidate_ready = False
                self.held_direction = ""

            close_ms = self.estimated_close_ms
            held = self.held_candidate_ready
            held_direction = self.held_direction

        remaining_ms = close_ms - (time.time() * 1000.0) if close_ms else -1
        seconds_text = f"{max(0, round(remaining_ms / 1000.0))}s" if remaining_ms > 0 else ""

        if bias_state == "UNSTABLE":
            self.set_bubble("UNSTABLE\nKEEP SCAN", "warn")
        elif bias_state == "NO_TRADE":
            self.set_bubble("CHECKING\nKEEP SCAN", "warn")
        else:
            held_text = f"\nHELD {held_direction}" if held else "\nNEXT"
            self.set_bubble(f"SCANNING {seconds_text}{held_text}")

        self.set_status(
            f"Screen scan active — {asset} {payout if payout else '—'}%",
            f"NEXT candle confirmation: ↑ {up}%  ↓ {down}% • instability {instability}",
        )

        if remaining_ms > 30000:
            return 4.5
        if remaining_ms > 22000:
            return 3.0
        if remaining_ms > 14000:
            return 1.4
        if remaining_ms > 9000:
            return 0.5
        if remaining_ms < 0:
            return 1.2
        return None

    def release_held_signal(self):
        with self.lock:
            if not self.armed or not self.held_candidate_ready:
                return
            direction = self.held_direction
            up = self.held_up
            down = self.held_down
            asset = self.held_asset
            payout = self.held_payout
            self.armed = False
            self.analyzing = False
            self.scan_session_id = ""
            self.estimated_close_ms = 0

        arrow = "↑" if direction == "UP" else "↓"
        self.set_bubble(f"NEXT {arrow} {direction}\n↑{up}%  ↓{down}%", "signal")
        self.set_status(
            f"NEXT candle: {direction}",
            f"{asset} {payout if payout else '—'}% • confirmation ↑ {up}% / ↓ {down}%",
        )
        self.root.after(12000, self.reset_bubble_if_idle)

    def finish_no_trade(self, reason):
        with self.lock:
            if not self.armed:
                return
            self.armed = False
            self.analyzing = False
            self.scan_session_id = ""
            self.estimated_close_ms = 0
            self.held_candidate_ready = False

        self.set_bubble("NO TRADE\nNEXT", "warn")
        self.set_status("NO TRADE", reason)
        self.root.after(7000, self.reset_bubble_if_idle)

    def reset_bubble_if_idle(self):
        with self.lock:
            if not self.sharing or self.armed or self.analyzing:
                return
        self.set_bubble("TT\nSCAN")

    def close_app(self):
        try:
            self.stop_screen_share()
        finally:
            self.root.destroy()

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    TradeTrackWindowsScanner().run()
