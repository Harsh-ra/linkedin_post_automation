#!/bin/bash
# Stage 1: Open a Chrome window that the LinkedIn scheduler can control.
#
# What it does:
#   - Opens Google Chrome with a remote-control port (9222) turned on.
#   - Uses its own separate profile folder, so your normal Chrome stays untouched.
#   - Goes straight to LinkedIn. You log in once; the login is remembered next time.
#
# How to use:
#   1. Run:  bash linkedin_launch.sh
#   2. In the Chrome window that opens, log into LinkedIn (do this yourself).
#   3. Leave that window OPEN, then tell Claude "I'm logged in".

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PROFILE="$HOME/.linkedin-scheduler-chrome"
PORT=9222

if [ ! -f "$CHROME" ]; then
  echo "ERROR: Google Chrome not found at: $CHROME"
  exit 1
fi

mkdir -p "$PROFILE"

echo "Opening Chrome on LinkedIn (remote-control port $PORT, profile: $PROFILE)..."
echo "When the window opens, log into LinkedIn, leave it open, and tell Claude 'I'm logged in'."

"$CHROME" \
  --remote-debugging-port="$PORT" \
  --user-data-dir="$PROFILE" \
  --no-first-run \
  --no-default-browser-check \
  --disable-extensions \
  "https://www.linkedin.com/feed/" \
  >/dev/null 2>&1 &

echo "Chrome launched (PID $!). Keep this window open."
