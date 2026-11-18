#!/usr/bin/env bash
# Installs a per-user launchd agent that runs backup.sh every night at 03:15
# (and catches up after the Mac wakes if it was asleep then). No administrator
# password needed. Re-run after updating backup.sh or moving the .env.
# Uninstall with:
#   launchctl bootout "gui/$(id -u)/com.thehive.backup"
#   rm ~/Library/LaunchAgents/com.thehive.backup.plist
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
data_dir="${HIVE_DATA_DIR:-$HOME/Library/Application Support/TheHive}"
# Resolve symlinks so the job reads the real .env, not a link in a worktree.
env_file="$(python3 -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "$repo_root/.env")"
[[ -f "$env_file" ]] || { echo "no .env at $env_file" >&2; exit 1; }
# Run an installed copy, so the job survives moving or deleting a checkout.
mkdir -p "$data_dir/bin"
install -m 700 "$repo_root/scripts/hive/backup.sh" "$data_dir/bin/backup.sh"
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
    <string>$data_dir/bin/backup.sh</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    <key>HIVE_ENV_FILE</key><string>$env_file</string>
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
