#!/usr/bin/env bash
# Installs a per-user launchd agent running Versity S3 Gateway (versitygw) as
# The Hive's local S3-compatible storage: a plain folder served over S3 on
# 127.0.0.1 only. Credentials come from the repo's gitignored .env
# (BUZZ_S3_ACCESS_KEY / BUZZ_S3_SECRET_KEY / BUZZ_S3_ENDPOINT / BUZZ_S3_BUCKET).
#
# Replaces MinIO, whose upstream repository is archived and which Homebrew
# deprecates. Uninstall with:
#   launchctl bootout "gui/$(id -u)/com.thehive.storage"
#   rm ~/Library/LaunchAgents/com.thehive.storage.plist
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
set -o allexport
# shellcheck disable=SC1091
source "$repo_root/.env"
set +o allexport

vgw="$(command -v versitygw || true)"
[[ -n "$vgw" ]] || { echo "versitygw not found: brew install versitygw" >&2; exit 1; }

label="com.thehive.storage"
plist="$HOME/Library/LaunchAgents/$label.plist"
data_dir="${HIVE_DATA_DIR:-$HOME/Library/Application Support/TheHive}/s3"
log_dir="$HOME/Library/Logs/TheHive"
listen="${BUZZ_S3_ENDPOINT#http://}"
mkdir -p "$data_dir" "$log_dir" "$(dirname "$plist")"

cat > "$plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$label</string>
  <key>ProgramArguments</key>
  <array>
    <string>$vgw</string>
    <string>--port</string><string>$listen</string>
    <string>--region</string><string>${BUZZ_S3_REGION:-us-east-1}</string>
    <string>posix</string>
    <string>$data_dir</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>ROOT_ACCESS_KEY_ID</key><string>$BUZZ_S3_ACCESS_KEY</string>
    <key>ROOT_SECRET_ACCESS_KEY</key><string>$BUZZ_S3_SECRET_KEY</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>15</integer>
  <key>StandardOutPath</key><string>$log_dir/storage.log</string>
  <key>StandardErrorPath</key><string>$log_dir/storage.log</string>
</dict>
</plist>
PLIST
# The plist holds the storage secret: keep it private to this user.
chmod 600 "$plist"

launchctl bootout "gui/$(id -u)/$label" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$plist"

# Create the bucket (idempotent) once the gateway answers.
for _ in $(seq 1 20); do
  if curl -s -o /dev/null "http://$listen/"; then break; fi
  sleep 0.5
done
status=$(curl -s -o /dev/null -w '%{http_code}' -X PUT \
  --aws-sigv4 "aws:amz:${BUZZ_S3_REGION:-us-east-1}:s3" \
  --user "$BUZZ_S3_ACCESS_KEY:$BUZZ_S3_SECRET_KEY" \
  "http://$listen/$BUZZ_S3_BUCKET")
case "$status" in
  200|409) echo "Installed $label; bucket $BUZZ_S3_BUCKET ready (HTTP $status)" ;;
  *) echo "Bucket create failed (HTTP $status); see $log_dir/storage.log" >&2; exit 1 ;;
esac
