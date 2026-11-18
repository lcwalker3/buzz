#!/usr/bin/env bash
# Rotates The Hive's service logs (~/Library/Logs/TheHive/*.log): any log
# over the size limit becomes <name>.log.1, older copies shift up, and only
# the newest few are kept. Run hourly by the launchd agent that
# install-logrotate-agent.sh installs; safe to run by hand at any time.
#
# Copy-then-truncate, not rename: launchd opens StandardOutPath once, in
# append mode, and the running relay keeps writing to that open file. After a
# truncate its next write lands at the new (zero) end. Lines written between
# the copy and the truncate can be lost; that window is milliseconds.
#
# Settings (environment): HIVE_LOG_DIR (default ~/Library/Logs/TheHive),
# HIVE_LOG_MAX_BYTES (default 10 MiB), HIVE_LOG_KEEP (default 5).
set -euo pipefail

log_dir="${HIVE_LOG_DIR:-$HOME/Library/Logs/TheHive}"
max_bytes="${HIVE_LOG_MAX_BYTES:-10485760}"
keep="${HIVE_LOG_KEEP:-5}"

[[ "$max_bytes" =~ ^[0-9]+$ && "$keep" =~ ^[1-9][0-9]*$ ]] || {
  echo "rotate-logs: HIVE_LOG_MAX_BYTES and HIVE_LOG_KEEP must be numbers" >&2
  exit 1
}
[[ -d "$log_dir" ]] || exit 0

shopt -s nullglob
for log in "$log_dir"/*.log; do
  [[ -f "$log" && ! -L "$log" ]] || continue
  size=$(stat -f %z "$log")
  (( size > max_bytes )) || continue

  rm -f "$log.$keep"
  for (( i = keep - 1; i >= 1; i-- )); do
    if [[ -f "$log.$i" ]]; then mv -f "$log.$i" "$log.$((i + 1))"; fi
  done
  cp -p "$log" "$log.1"
  : > "$log"
  echo "rotate-logs: rotated $log ($size bytes)"
done
