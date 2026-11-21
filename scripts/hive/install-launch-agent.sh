#!/usr/bin/env bash
# Installs a per-user launchd agent that starts The Hive relay at login and
# restarts it if it exits. Re-run after moving the checkout. Uninstall with:
#   launchctl bootout "gui/$(id -u)/com.thehive.relay"
#   rm ~/Library/LaunchAgents/com.thehive.relay.plist
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
label="com.thehive.relay"
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
    <string>$repo_root/scripts/hive/run-relay.sh</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <!-- Back off restarts so a persistent failure can't spin the CPU. -->
  <key>ThrottleInterval</key><integer>15</integer>
  <key>StandardOutPath</key><string>$log_dir/relay.log</string>
  <key>StandardErrorPath</key><string>$log_dir/relay.log</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$(id -u)/$label" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$plist"
echo "Installed $label; logs: $log_dir/relay.log"
