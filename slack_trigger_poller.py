#!/usr/bin/env python3
"""
Unified Slack-triggered publisher (launchd: com.harshrajpathak.social-slack-trigger).

Polls the shared Slack channel every ~2 min. When a NEW message whose text is exactly
"schedule" (case-insensitive) appears, it:
  1) Schedules today's LinkedIn posts via ~/linkedin-pipeline/run_scheduler.sh (Chrome 9222).
…and reports each step back in the channel.

Requirements:
  - SLACK_BOT_TOKEN in .env with channels:history (bot is a channel member).
  - LinkedIn Chrome open + logged in:  bash linkedin/linkedin_launch.sh   (port 9222)

State: slack_trigger_state.json holds the last-processed message ts (first run = baseline only).
"""
import os, json, time, subprocess, urllib.request, urllib.parse

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CHANNEL = "C0BCQBXU97W"          # #linkedin-content (shared)
TRIGGER = "schedule"
LI_PORT = 9222
LI_SCHEDULER = "/Users/harshrajpathak/linkedin-pipeline/run_scheduler.sh"
STATE_FILE = os.path.join(SCRIPT_DIR, "slack_trigger_state.json")
LOCK_FILE = os.path.join(SCRIPT_DIR, "slack_trigger.lock")
LOCK_STALE = 1800
STEP_TIMEOUT = 1800


def read_token():
    for p in (os.path.join(SCRIPT_DIR, ".env"), os.path.join(SCRIPT_DIR, "linkedin", ".env")):
        try:
            for line in open(p):
                if line.startswith("SLACK_BOT_TOKEN="):
                    return line.strip().split("=", 1)[1]
        except OSError:
            pass
    return None


TOKEN = read_token()


def slack_get(method, params):
    url = f"https://slack.com/api/{method}?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {TOKEN}"})
    with urllib.request.urlopen(req, timeout=15) as res:
        return json.loads(res.read().decode("utf-8"))


def post_message(text):
    data = json.dumps({"channel": CHANNEL, "text": text, "unfurl_links": False, "unfurl_media": False}).encode()
    req = urllib.request.Request("https://slack.com/api/chat.postMessage", data=data,
                                 headers={"Authorization": f"Bearer {TOKEN}",
                                          "Content-Type": "application/json; charset=utf-8"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            r = json.loads(res.read().decode())
            if not r.get("ok"):
                print("postMessage error:", r.get("error"))
    except Exception as e:
        print("postMessage exception:", e)


def load_state():
    try:
        return json.load(open(STATE_FILE))
    except (OSError, ValueError):
        return {}


def save_state(s):
    json.dump(s, open(STATE_FILE, "w"))


def acquire_lock():
    try:
        fd = os.open(LOCK_FILE, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.write(fd, str(os.getpid()).encode()); os.close(fd)
        return True
    except FileExistsError:
        try:
            if time.time() - os.path.getmtime(LOCK_FILE) > LOCK_STALE:
                os.remove(LOCK_FILE); return acquire_lock()
        except FileNotFoundError:
            return acquire_lock()
        return False


def release_lock():
    try:
        os.remove(LOCK_FILE)
    except FileNotFoundError:
        pass


def chrome_up(port):
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/json/version", timeout=3) as r:
            return r.status == 200
    except Exception:
        return False


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=STEP_TIMEOUT, cwd=SCRIPT_DIR, **kw)


def do_linkedin():
    if not chrome_up(LI_PORT):
        post_message(f"⚠️ LinkedIn Chrome isn't on port {LI_PORT}. Run `bash linkedin/linkedin_launch.sh`, log in, then type *schedule* again.")
        return
    post_message("⏳ Scheduling today's LinkedIn posts…")
    try:
        p = run(["/bin/bash", LI_SCHEDULER])
    except subprocess.TimeoutExpired:
        post_message("❌ LinkedIn scheduler timed out (30 min)."); return
    out = p.stdout or ""
    if p.returncode == 0:
        plan = "\n".join(l.strip() for l in out.splitlines()
                         if any(t in l for t in ("(carousel)", "(infographic)", "(regular)", "(poll)")))
        post_message("✅ *LinkedIn scheduled!* 🎉" + (("\n\n" + plan) if plan else ""))
    else:
        post_message("⚠️ LinkedIn scheduling hit a problem:\n```" + "\n".join(out.splitlines()[-12:])[-1100:] + "```")


def publish():
    post_message("🚀 Got it — scheduling today's LinkedIn posts…")
    do_linkedin()
    post_message("🏁 Done with today's publish run.")


def main():
    if not TOKEN:
        print("SLACK_BOT_TOKEN not found"); return
    if not acquire_lock():
        print("Another run in progress; exiting."); return
    try:
        state = load_state()
        if "last_ts" not in state:
            save_state({"last_ts": f"{time.time():.6f}"})
            print("First run — baseline recorded."); return
        last_ts = float(state["last_ts"])
        try:
            resp = slack_get("conversations.history", {"channel": CHANNEL, "oldest": state["last_ts"], "limit": 50})
        except Exception as e:
            print("history fetch failed:", e); return
        if not resp.get("ok"):
            err = resp.get("error"); print("history error:", err)
            if err in ("missing_scope", "not_in_channel") and state.get("flagged_error") != err:
                hint = ("add channels:history scope + reinstall" if err == "missing_scope" else "/invite the bot to the channel")
                post_message(f"⚠️ Slack trigger can't read the channel ({err}). Please {hint}.")
                state["flagged_error"] = err; save_state(state)
            return
        if state.get("flagged_error"):
            state.pop("flagged_error", None); save_state(state)
        msgs = sorted(resp.get("messages", []), key=lambda m: float(m.get("ts", 0)))
        max_ts, triggered = last_ts, False
        for m in msgs:
            ts = float(m.get("ts", 0))
            if ts <= last_ts:
                continue
            max_ts = max(max_ts, ts)
            if m.get("subtype") == "bot_message" or m.get("bot_id"):
                continue
            if (m.get("text") or "").strip().lower() == TRIGGER:
                triggered = True
        if max_ts > last_ts:
            state["last_ts"] = f"{max_ts:.6f}"; save_state(state)
        if triggered:
            publish()
        else:
            print("No new trigger.")
    finally:
        release_lock()


if __name__ == "__main__":
    main()
