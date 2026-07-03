#!/bin/bash
# Open a Chrome window the Instagram poster can control (direct post-now).
#   - Remote-control port 9223 (LinkedIn uses 9222, no clash)
#   - Separate profile, your normal Chrome untouched
#   - Opens instagram.com — you log in there once; it's remembered next time
#
# Use:
#   1. bash instagram_launch.sh
#   2. Log into Instagram in that window.
#   3. Leave it OPEN, tell Claude "I'm logged in".
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PROFILE="$HOME/.instagram-scheduler-chrome"
PORT=9223
[ ! -f "$CHROME" ] && { echo "ERROR: Chrome not found at $CHROME"; exit 1; }
mkdir -p "$PROFILE"
echo "Opening Chrome on instagram.com (port $PORT, profile $PROFILE)..."
echo "Log in, leave the window open, then tell Claude 'I'm logged in'."
"$CHROME" \
  --remote-debugging-port="$PORT" \
  --user-data-dir="$PROFILE" \
  --no-first-run --no-default-browser-check --disable-extensions \
  "https://www.instagram.com/" \
  >/dev/null 2>&1 &
echo "Chrome launched (PID $!). Keep it open."
