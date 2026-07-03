#!/usr/bin/env python3
"""
Slack-triggered LinkedIn scheduler poller.

Runs every couple of minutes via launchd (com.harshrajpathak.linkedin-slack-trigger).
Watches the Slack channel; when a NEW message whose text is exactly "schedule"
(case-insensitive) appears, it runs the dynamic LinkedIn scheduler for today's
posts (Carousel -> Infographic -> Collaborative Article -> Poll, 1h apart) and
reports back in the channel.

Requirements:
  - Slack bot token in .env (SLACK_BOT_TOKEN=) with the `channels:history` scope
    (or `groups:history` for a private channel), and the bot must be a member of
    the channel.
  - The LinkedIn Chrome window open + logged in (bash linkedin_launch.sh, port 9222).

State: slack_trigger_state.json holds the last-processed Slack message ts so we
never schedule twice for the same message. On the very first run it just records
a baseline and does nothing (so old "schedule" messages aren't replayed).
"""

import os
import json
import time
import subprocess
import urllib.request
import urllib.parse
import urllib.error

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CHANNEL = "C0BCQBXU97W"            # #linkedin-content
TRIGGER = "schedule"               # exact-match trigger word (case-insensitive)
CHROME_PORT = 9222
STATE_FILE = os.path.join(SCRIPT_DIR, "slack_trigger_state.json")
LOCK_FILE = os.path.join(SCRIPT_DIR, "slack_trigger.lock")
LOCK_STALE_SECONDS = 1800          # steal a lock older than 30 min
SCHEDULER_TIMEOUT = 1800           # kill a scheduling run after 30 min


def read_token():
    try:
        with open(os.path.join(SCRIPT_DIR, ".env")) as f:
            for line in f:
                if line.startswith("SLACK_BOT_TOKEN="):
                    return line.strip().split("=", 1)[1]
    except OSError:
        pass
    return None


TOKEN = read_token()


# ---------- Slack API ----------

def slack_get(method, params):
    url = f"https://slack.com/api/{method}?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {TOKEN}"})
    with urllib.request.urlopen(req, timeout=15) as res:
        return json.loads(res.read().decode("utf-8"))


def post_message(text):
    url = "https://slack.com/api/chat.postMessage"
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json; charset=utf-8",
    }
    payload = {"channel": CHANNEL, "text": text, "unfurl_links": False, "unfurl_media": False}
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"),
                                headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            resp = json.loads(res.read().decode("utf-8"))
            if not resp.get("ok"):
                print(f"postMessage error: {resp.get('error')}")
    except Exception as e:
        print(f"postMessage exception: {e}")


# ---------- State + lock ----------

def load_state():
    try:
        with open(STATE_FILE) as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def save_state(state):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f)


def acquire_lock():
    try:
        fd = os.open(LOCK_FILE, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.write(fd, str(os.getpid()).encode())
        os.close(fd)
        return True
    except FileExistsError:
        try:
            if time.time() - os.path.getmtime(LOCK_FILE) > LOCK_STALE_SECONDS:
                os.remove(LOCK_FILE)
                return acquire_lock()
        except FileNotFoundError:
            return acquire_lock()
        return False


def release_lock():
    try:
        os.remove(LOCK_FILE)
    except FileNotFoundError:
        pass


# ---------- Scheduler ----------

def chrome_up():
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{CHROME_PORT}/json/version", timeout=3) as r:
            return r.status == 200
    except Exception:
        return False


def run_scheduler_and_report():
    post_message("⏳ Got it — scheduling today's 4 LinkedIn posts "
                 "(Carousel → Infographic → Collaborative Article → Poll, 1h apart)…")

    if not chrome_up():
        post_message("⚠️ LinkedIn Chrome isn't running on port 9222.\n"
                     "Open it with `bash linkedin_launch.sh`, log into LinkedIn, "
                     "then type *schedule* again.")
        return

    try:
        proc = subprocess.run(
            ["/bin/bash", os.path.join(SCRIPT_DIR, "run_scheduler.sh")],
            capture_output=True, text=True, timeout=SCHEDULER_TIMEOUT,
        )
    except subprocess.TimeoutExpired:
        post_message("❌ Scheduler timed out after 30 minutes. Check logs/ in the project.")
        return

    out = proc.stdout or ""
    plan = [l.strip() for l in out.splitlines()
            if any(t in l for t in ("(carousel)", "(infographic)", "(regular)", "(poll)"))]
    scheduled = sum(1 for l in out.splitlines() if "Successfully scheduled Post" in l)
    plan_text = "\n".join(plan)

    if proc.returncode == 0:
        msg = "✅ *Done — all 4 posts are scheduled on LinkedIn!* 🎉"
        if plan_text:
            msg += "\n\n" + plan_text
        post_message(msg)
    else:
        tail = "\n".join(out.splitlines()[-12:])[-1200:]
        post_message(
            f"⚠️ *Scheduled {scheduled} of 4 posts*, then hit a problem:\n```{tail}```"
        )


# ---------- Main ----------

def main():
    if not TOKEN:
        print("SLACK_BOT_TOKEN not found in .env")
        return
    if not acquire_lock():
        print("Another poll/scheduling run is in progress; exiting.")
        return

    try:
        state = load_state()
        if "last_ts" not in state:
            # First run: establish a baseline, don't replay old messages.
            save_state({"last_ts": f"{time.time():.6f}"})
            print("First run — baseline timestamp recorded; not acting on history.")
            return

        last_ts = float(state["last_ts"])
        try:
            resp = slack_get("conversations.history",
                             {"channel": CHANNEL, "oldest": state["last_ts"], "limit": 50})
        except Exception as e:
            print(f"history fetch failed: {e}")
            return

        if not resp.get("ok"):
            err = resp.get("error")
            print(f"conversations.history error: {err}")
            if err in ("missing_scope", "not_in_channel"):
                # Surface setup problems once, but don't spam every 2 min.
                if state.get("flagged_error") != err:
                    hint = ("add the `channels:history` scope to the bot and reinstall the app"
                            if err == "missing_scope"
                            else "invite the bot to the channel (`/invite @your-bot`)")
                    post_message(f"⚠️ Slack trigger can't read the channel ({err}). Please {hint}.")
                    state["flagged_error"] = err
                    save_state(state)
            return

        # Clear any previously-flagged error now that reads work.
        if state.get("flagged_error"):
            state.pop("flagged_error", None)
            save_state(state)

        messages = sorted(resp.get("messages", []), key=lambda m: float(m.get("ts", 0)))
        max_ts = last_ts
        triggered = False
        for m in messages:
            ts = float(m.get("ts", 0))
            if ts <= last_ts:
                continue
            if ts > max_ts:
                max_ts = ts
            if m.get("subtype") == "bot_message" or m.get("bot_id"):
                continue
            if (m.get("text") or "").strip().lower() == TRIGGER:
                triggered = True

        # Advance the watermark BEFORE running, so a trigger is never processed twice
        # even if the scheduling run is slow or crashes.
        if max_ts > last_ts:
            state["last_ts"] = f"{max_ts:.6f}"
            save_state(state)

        if triggered:
            run_scheduler_and_report()
        else:
            print("No new trigger.")
    finally:
        release_lock()


if __name__ == "__main__":
    main()
