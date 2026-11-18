#!/usr/bin/env bash
# Installs a per-user launchd agent that runs backup.sh every night at 03:15
# (and catches up after the Mac wakes if it was asleep then). No administrator
# password needed. Re-run after moving the checkout.
# Uninstall with:
#   launchctl bootout "gui/$(id -u)/com.thehive.backup"
#   rm ~/Library/LaunchAgents/com.thehive.backup.plist
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
label="com.thehive.backup"
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
    <string>$repo_root/scripts/hive/backup.sh</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>3</integer>
    <key>Minute</key><integer>15</integer>
  </dict>
  <key>StandardOutPath</key><string>$log_dir/backup.log</string>
  <key>StandardErrorPath</key><string>$log_dir/backup.log</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$(id -u)/$label" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$plist"
echo "Installed $label; backs up nightly at 03:15; log: $log_dir/backup.log"
