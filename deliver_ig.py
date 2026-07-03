#!/usr/bin/env python3
"""
deliver_ig.py — post the day's Instagram extras (1 carousel + 1 reel + caption) to
the shared Slack channel, right after the LinkedIn batch. Uses curl for transport
(no pip deps), mirroring instagram/send_to_slack.py's external-upload flow.

Reads:  output/<DATE>/instagram/{caption.txt, carousel/slide-0N.png, reel.mp4}
Env:    SLACK_BOT_TOKEN (.env), SLACK_CHANNEL_ID (defaults to #linkedin-content)
Usage:  python3 deliver_ig.py [YYYY-MM-DD]
"""
import sys, os, json, glob, subprocess, datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
DEFAULT_CHANNEL = "C0BCQBXU97W"  # #linkedin-content — one channel for both platforms


def load_env():
    env = {}
    for p in (os.path.join(ROOT, ".env"), os.path.join(ROOT, "linkedin", ".env")):
        if os.path.exists(p):
            for line in open(p):
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env.setdefault(k.strip(), v.strip())
    return env


ENV = load_env()
TOKEN = ENV.get("SLACK_BOT_TOKEN") or os.environ.get("SLACK_BOT_TOKEN", "")
CHANNEL = ENV.get("SLACK_CHANNEL_ID") or os.environ.get("SLACK_CHANNEL_ID", "") or DEFAULT_CHANNEL
if not TOKEN:
    sys.exit("ERROR: SLACK_BOT_TOKEN not set in .env")


def curl_json(url, fields=None, json_body=None):
    cmd = ["curl", "-s", "-X", "POST", url, "-H", f"Authorization: Bearer {TOKEN}"]
    if json_body is not None:
        cmd += ["-H", "Content-Type: application/json", "-d", json.dumps(json_body)]
    for k, v in (fields or {}).items():
        cmd += ["-F", f"{k}={v}"]
    out = subprocess.run(cmd, capture_output=True, text=True).stdout
    try:
        return json.loads(out)
    except json.JSONDecodeError:
        return {"ok": False, "raw": out}


def post_message(text):
    r = curl_json("https://slack.com/api/chat.postMessage",
                  json_body={"channel": CHANNEL, "text": text, "unfurl_links": False})
    print("  msg OK" if r.get("ok") else f"  msg ERROR: {r.get('error', r)}")


def upload_file(file_path, file_name, caption=""):
    size = os.path.getsize(file_path)
    up = curl_json("https://slack.com/api/files.getUploadURLExternal",
                   fields={"filename": file_name, "length": size})
    upload_url, file_id = up.get("upload_url"), up.get("file_id")
    if not upload_url:
        print(f"  upload ERROR ({file_name}): {up.get('error', up)}")
        return
    subprocess.run(["curl", "-s", "-X", "POST", upload_url, "-F", f"filename=@{file_path}"],
                   capture_output=True)
    done = curl_json("https://slack.com/api/files.completeUploadExternal",
                     json_body={"files": [{"id": file_id, "title": file_name}],
                                "channel_id": CHANNEL, "initial_comment": caption})
    print(f"  file {file_name}: {'OK' if done.get('ok') else 'ERROR: ' + str(done.get('error', done))}")


def main():
    date = sys.argv[1] if len(sys.argv) > 1 else datetime.date.today().isoformat()
    igdir = os.path.join(ROOT, "output", date, "instagram")
    if not os.path.isdir(igdir):
        sys.exit(f"ERROR: no Instagram output for {date}: {igdir}")

    caption = ""
    cap_path = os.path.join(igdir, "caption.txt")
    if os.path.exists(cap_path):
        caption = open(cap_path).read().strip()

    post_message(f"📸 *Instagram extras — {date}* (same topic as today's LinkedIn carousel)\n"
                 f"1 carousel + 1 reel below. These will be *direct-posted* to Instagram when you type *schedule*.")

    # Caption as its own copyable message
    if caption:
        post_message("*Instagram caption (copy-paste):*\n\n" + caption)

    # Carousel slides
    slides = sorted(glob.glob(os.path.join(igdir, "carousel", "slide-*.png")))
    print(f"Carousel: {len(slides)} slides")
    post_message("━━━ 🎠 INSTAGRAM CAROUSEL (4:5) ━━━")
    for s in slides:
        n = os.path.basename(s).split("-")[1].split(".")[0]
        upload_file(s, os.path.basename(s), f"Slide {n}")

    # Reel
    reel = os.path.join(igdir, "reel.mp4")
    if os.path.exists(reel):
        print("Reel: found")
        upload_file(reel, "reel.mp4", "━━━ 🎬 INSTAGRAM REEL (9:16) ━━━")
    else:
        print("Reel: MISSING (skipped)")
        post_message("⚠️ Instagram reel.mp4 was not rendered for today — check logs.")

    print("Done. Instagram extras delivered to Slack.")


if __name__ == "__main__":
    main()
