#!/bin/bash
# Daily auto-run: generate posts + build images + send to Slack.
# Does NOT touch LinkedIn — scheduling stays manual (you tell Claude "schedule the post").
# Run by the macOS timer (launchd) every day at 12:00 PM.

PROJECT="/Users/harshrajpathak/linkedin-pipeline"
PY="/opt/anaconda3/bin/python3"
NODE="/usr/local/bin/node"

cd "$PROJECT" || exit 1
mkdir -p logs
LOG="logs/daily-$(date +%Y%m%d).log"

# Make the bundled Chrome / tools findable
export PATH="/usr/local/bin:/opt/anaconda3/bin:/usr/bin:/bin:/usr/sbin:/sbin"

run() {
  echo "" >> "$LOG"
  echo "=== $(date '+%H:%M:%S') RUN: $* ===" >> "$LOG"
  "$@" >> "$LOG" 2>&1
  echo "--- exit code: $? ---" >> "$LOG"
}

echo "############ DAILY RUN $(date) ############" >> "$LOG"

# Phase 1 — fetch data
run "$PY" fetch_reddit_rss.py
run "$PY" fetch_ai_news_rss.py

# Phase 2 — generate content
run "$PY" generate_posts_via_openrouter.py
run "$PY" generate_ai_news.py

# Phase 3 — build visuals
run "$NODE" build_carousel_today.cjs
run "$PY" generate_infographic_today.py
run "$NODE" cap_infographic_today.cjs

# Phase 4 — deliver to Slack
run "$PY" send_to_slack.py

echo "############ DAILY RUN COMPLETE $(date) ############" >> "$LOG"
