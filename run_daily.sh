#!/bin/bash
# run_daily.sh — the 11:00 AM job (launchd: com.harshrajpathak.social-daily).
# 1) Generate + deliver the full LinkedIn batch using the proven engine at ~/linkedin-pipeline.
# Scheduling/posting stays manual: you type "schedule" in Slack (see slack_trigger_poller.py).

PROJECT="/Users/harshrajpathak/Desktop/daily-social-posts-pipeline"
LINKEDIN_DIR="/Users/harshrajpathak/linkedin-pipeline"   # proven LinkedIn engine (source of truth)
export LINKEDIN_DIR
export PATH="/usr/local/bin:/opt/anaconda3/bin:/usr/bin:/bin:/usr/sbin:/sbin"

cd "$PROJECT" || exit 1
mkdir -p logs
LOG="logs/daily-$(date +%Y%m%d).log"

run() { echo "" >>"$LOG"; echo "=== $(date '+%H:%M:%S') RUN: $* ===" >>"$LOG"; "$@" >>"$LOG" 2>&1; echo "--- exit $? ---" >>"$LOG"; }

echo "############ SOCIAL DAILY RUN $(date) ############" >>"$LOG"

# 1) LinkedIn: generate + deliver (writes carousel_data.json in $LINKEDIN_DIR)
run /bin/bash "$LINKEDIN_DIR/run_daily.sh"

echo "############ SOCIAL DAILY COMPLETE $(date) ############" >>"$LOG"
echo "Done. LinkedIn batch delivered to Slack. Type 'schedule' in Slack to publish."
