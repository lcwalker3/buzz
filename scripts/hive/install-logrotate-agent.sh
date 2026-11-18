#!/usr/bin/env bash
# Installs a per-user launchd agent that runs rotate-logs.sh every hour (and
# once at login), keeping ~/Library/Logs/TheHive/*.log to 10 MiB x 5 copies.
# No administrator password needed. Re-run after moving the checkout.
# Uninstall with:
#   launchctl bootout "gui/$(id -u)/com.thehive.logrotate"
#   rm ~/Library/LaunchAgents/com.thehive.logrotate.plist
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
label="com.thehive.logrotate"
plist="$HOME/Library/LaunchAgents/$label.plist"
log_dir="$HOME/Library/Logs/TheHive"
mkdir -p "$log_dir" "$(dirname "$plist")"

cat > "$plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$label</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$repo_root/scripts/hive/rotate-logs.sh</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>StartInterval</key><integer>3600</integer>
  <!-- Not *.log, so this agent's own output is never rotated mid-write. -->
  <key>StandardOutPath</key><string>$log_dir/logrotate.out</string>
  <key>StandardErrorPath</key><string>$log_dir/logrotate.out</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$(id -u)/$label" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$plist"
echo "Installed $label; runs hourly; output: $log_dir/logrotate.out"
