#!/usr/bin/env python3
"""
send_to_slack.py — deliver a day's Instagram content batch to Slack.

Reads ./output/<DATE>/manifest.json (see schema below), posts each caption as a
separate, individually-copyable message, and uploads slides / infographic / reel
files via Slack's external-upload flow (files.getUploadURLExternal ->
PUT to upload_url -> files.completeUploadExternal). Mirrors the proven flow from
the LinkedIn pipeline. Uses curl for transport so there are no Python deps.

manifest.json schema:
{
  "date": "2026-06-25",
  "header": "optional override for the drop header message",
  "items": [
    {"type": "carousel",    "title": "Hook ...", "caption_file": "captions/carousel-1.txt", "slides_dir": "carousels/carousel-1"},
    {"type": "infographic", "title": "Stat ...", "caption_file": "captions/infographic.txt", "image": "infographic.png"},
    {"type": "reel",        "title": "Reel ...", "caption_file": "captions/reel-1.txt",     "video": "reels/reel-1.mp4"}
  ]
}

Usage: python3 send_to_slack.py [YYYY-MM-DD]   (defaults to today)
Env (from ./.env): SLACK_BOT_TOKEN, SLACK_CHANNEL_ID
"""
import sys, os, json, subprocess, datetime, glob

ROOT = os.path.dirname(os.path.abspath(__file__))


def load_env():
    env = {}
    path = os.path.join(ROOT, ".env")
    if os.path.exists(path):
        for line in open(path):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    return env


ENV = load_env()
TOKEN = ENV.get("SLACK_BOT_TOKEN") or os.environ.get("SLACK_BOT_TOKEN", "")
CHANNEL = ENV.get("SLACK_CHANNEL_ID") or os.environ.get("SLACK_CHANNEL_ID", "")

if not TOKEN or not CHANNEL:
    sys.exit("ERROR: SLACK_BOT_TOKEN and SLACK_CHANNEL_ID must be set in ./.env")


def curl_json(url, fields=None, json_body=None):
    cmd = ["curl", "-s", "-X", "POST", url, "-H", f"Authorization: Bearer {TOKEN}"]
    if json_body is not None:
        cmd += ["-H", "Content-Type: application/json", "-d", json.dumps(json_body)]
    if fields:
        for k, v in fields.items():
            cmd += ["-F", f"{k}={v}"]
    out = subprocess.run(cmd, capture_output=True, text=True).stdout
    try:
        return json.loads(out)
    except json.JSONDecodeError:
        return {"ok": False, "raw": out}


def post_message(text):
    r = curl_json("https://slack.com/api/chat.postMessage",
                  json_body={"channel": CHANNEL, "text": text})
    print(("  msg OK" if r.get("ok") else f"  msg ERROR: {r.get('error', r)}"))
    return r.get("ok")


def upload_file(file_path, file_name, caption):
    size = os.path.getsize(file_path)
    up = curl_json("https://slack.com/api/files.getUploadURLExternal",
                   fields={"filename": file_name, "length": size})
    upload_url, file_id = up.get("upload_url"), up.get("file_id")
    if not upload_url:
        print(f"  upload ERROR ({file_name}): {up.get('error', up)}")
        return False
    subprocess.run(["curl", "-s", "-X", "POST", upload_url, "-F", f"filename=@{file_path}"],
                   capture_output=True)
    done = curl_json("https://slack.com/api/files.completeUploadExternal",
                     json_body={"files": [{"id": file_id, "title": file_name}],
                                "channel_id": CHANNEL, "initial_comment": caption})
    ok = done.get("ok")
    print(f"  file {file_name}: {'OK' if ok else 'ERROR: ' + str(done.get('error', done))}")
    return ok


def read_caption(date_dir, rel):
    if not rel:
        return ""
    p = os.path.join(date_dir, rel)
    return open(p).read().strip() if os.path.exists(p) else ""


def main():
    date = sys.argv[1] if len(sys.argv) > 1 else datetime.date.today().isoformat()
    date_dir = os.path.join(ROOT, "output", date)
    manifest_path = os.path.join(date_dir, "manifest.json")
    if not os.path.exists(manifest_path):
        sys.exit(f"ERROR: manifest not found: {manifest_path}")

    manifest = json.load(open(manifest_path))
    items = manifest.get("items", [])
    counts = {}
    for it in items:
        counts[it["type"]] = counts.get(it["type"], 0) + 1
    summary = " + ".join(f"{n} {t}{'s' if n > 1 else ''}" for t, n in counts.items())

    header = manifest.get("header") or (
        f"📸 *Instagram Content Drop — {date}*\n{summary} ready to post. "
        f"Captions are below each asset; copy and paste into Instagram.")
    print("Posting header...")
    post_message(header)

    for idx, it in enumerate(items, 1):
        typ = it["type"]
        title = it.get("title", typ)
        caption = read_caption(date_dir, it.get("caption_file"))
        print(f"\n[{idx}/{len(items)}] {typ}: {title}")

        if typ == "carousel":
            post_message(f"━━━ 🎠 CAROUSEL {idx} ━━━\n\n{caption}")
            slides_dir = os.path.join(date_dir, it.get("slides_dir", ""))
            slides = sorted(glob.glob(os.path.join(slides_dir, "slide-*.png")))
            if not slides:
                print(f"  WARN: no slides found in {slides_dir}")
            for s in slides:
                name = os.path.basename(s)
                num = name.split("-")[1].split(".")[0]
                upload_file(s, name, f"Slide {num}")

        elif typ == "infographic":
            img = os.path.join(date_dir, it.get("image", ""))
            if os.path.exists(img):
                upload_file(img, os.path.basename(img), f"━━━ 📊 INFOGRAPHIC ━━━\n\n{caption}")
            else:
                print(f"  WARN: infographic image missing: {img}")

        elif typ == "reel":
            vid = os.path.join(date_dir, it.get("video", ""))
            if os.path.exists(vid):
                upload_file(vid, os.path.basename(vid), f"━━━ 🎬 REEL {idx} ━━━\n\n{caption}")
            else:
                print(f"  WARN: reel video missing: {vid}")
        else:
            print(f"  WARN: unknown item type '{typ}', skipping")

    print("\nDone. All assets delivered to Slack.")


if __name__ == "__main__":
    main()
