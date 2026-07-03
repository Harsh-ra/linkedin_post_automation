#!/bin/bash
# Runs the dynamic LinkedIn scheduler for a given posts date (default: today).
# Invoked by slack_trigger_poller.py when you type "schedule" in your Slack channel.
# Requires the LinkedIn Chrome window to be open + logged in (bash linkedin_launch.sh, port 9222).
#
# Usage:  bash run_scheduler.sh [YYYYMMDD]

PROJECT="/Users/harshrajpathak/linkedin-pipeline"
NODE="/usr/local/bin/node"

cd "$PROJECT" || exit 1
mkdir -p logs

# Make node / bundled tools findable under launchd's minimal env
export PATH="/usr/local/bin:/opt/anaconda3/bin:/usr/bin:/bin:/usr/sbin:/sbin"

LOG="logs/schedule-$(date +%Y%m%d-%H%M%S).log"
echo "=== SCHEDULE RUN $(date) ===" | tee -a "$LOG"

"$NODE" schedule_today.cjs "$@" 2>&1 | tee -a "$LOG"
exit "${PIPESTATUS[0]}"
