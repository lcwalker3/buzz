#!/usr/bin/env bash
# The Hive health check. Checks every service and setting the Mac server
# needs and says, in plain words, what to fix. Changes nothing.
#
#   scripts/hive/doctor.sh
#
# Exit code: 0 when everything needed is working, 1 when something is broken.
# Warnings (things to do soon) do not fail the check.
set -uo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
data_dir="${HIVE_DATA_DIR:-$HOME/Library/Application Support/TheHive}"
log_dir="$HOME/Library/Logs/TheHive"
backup_dir="${HIVE_BACKUP_DIR:-$HOME/HiveBackups}"

failures=0
warnings=0
ok() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; warnings=$((warnings + 1)); }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1"; failures=$((failures + 1)); }

echo "The Hive health check"
echo

echo "Settings"
if [[ -f "$repo_root/.env" ]]; then
  ok ".env found"
  set -o allexport
  # shellcheck disable=SC1091
  source "$repo_root/.env"
  set +o allexport
else
  fail ".env missing at $repo_root/.env (copy .env.example and fill it in)"
fi

relay_url="${RELAY_URL:-}"
case "$relay_url" in
  wss://*) ok "Address: $relay_url" ;;
  "") fail "RELAY_URL is not set in .env" ;;
  *) warn "RELAY_URL is $relay_url; the iPhone app needs a wss:// address (see docs/hive/remote-access.md)" ;;
esac

owner="${RELAY_OWNER_PUBKEY:-}"
if [[ -z "$owner" ]]; then
  warn "No owner yet: set RELAY_OWNER_PUBKEY to your public key (64 hex characters)"
elif [[ "$owner" =~ ^[0-9a-fA-F]{64}$ ]]; then
  ok "Owner key set"
else
  fail "RELAY_OWNER_PUBKEY must be 64 hex characters, not an npub (the relay will not start)"
fi

if [[ -n "${RELAY_OPERATOR_PUBKEYS:-}" && -z "${RELAY_OPERATOR_API_ORIGIN:-}" ]]; then
  fail "RELAY_OPERATOR_PUBKEYS is set but RELAY_OPERATOR_API_ORIGIN is not (community creation will be refused)"
elif [[ -n "${RELAY_OPERATOR_PUBKEYS:-}" ]]; then
  ok "Operator key set (communities can be created)"
fi
echo

echo "Services"
if pg_isready -q -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" 2>/dev/null; then
  ok "Database (PostgreSQL) is accepting connections"
else
  fail "Database is not responding: brew services restart postgresql@17"
fi

if redis-cli -u "${REDIS_URL:-redis://127.0.0.1:6379}" ping 2>/dev/null | grep -q PONG; then
  ok "Redis is responding"
else
  fail "Redis is not responding: brew services restart redis"
fi

storage="${HIVE_S3_ENDPOINT:-http://127.0.0.1:9000}"
if curl -s -o /dev/null -m 5 "$storage"; then
  ok "File storage is responding at $storage"
else
  fail "File storage is not responding: scripts/hive/install-storage-agent.sh"
fi

bind="${HIVE_BIND_ADDR:-127.0.0.1:3000}"
code="$(curl -s -o /dev/null -m 5 -w '%{http_code}' "http://$bind/" || true)"
if [[ "$code" == "200" ]]; then
  ok "Relay is serving The Hive at http://$bind"
else
  fail "Relay is not serving (HTTP ${code:-none}): see $log_dir/relay.log, then launchctl kickstart -k gui/$(id -u)/com.thehive.relay"
fi

if [[ -f "$repo_root/web/dist/index.html" ]]; then
  ok "Web app is built"
else
  warn "Web app is not built: cd web && pnpm install && pnpm build"
fi

if [[ "$relay_url" == wss://* ]]; then
  public_url="https://${relay_url#wss://}"
  if curl -s -o /dev/null -m 8 "$public_url/"; then
    ok "Reachable over Tailscale at $public_url"
  else
    warn "Not reachable at $public_url: is Tailscale on and 'tailscale serve --bg 3000' set?"
  fi
fi
echo

echo "Storage and backups"
free_pct="$(df -P "$HOME" | awk 'NR==2 {gsub("%","",$5); print 100-$5}')"
if [[ "${free_pct:-0}" -ge 10 ]]; then
  ok "Disk has ${free_pct}% free"
else
  fail "Disk is almost full (${free_pct}% free)"
fi

if [[ -d "$log_dir" ]]; then
  log_kb="$(du -sk "$log_dir" | awk '{print $1}')"
  if [[ "$log_kb" -lt 512000 ]]; then
    ok "Logs use $((log_kb / 1024)) MB"
  else
    warn "Logs use $((log_kb / 1024)) MB: scripts/hive/install-logrotate-agent.sh keeps them small"
  fi
fi

latest="$(ls -1d "$backup_dir"/20* 2>/dev/null | sort | tail -1)"
if [[ -z "$latest" ]]; then
  warn "No backups yet: run scripts/hive/backup.sh, then scripts/hive/install-backup-agent.sh for nightly backups"
else
  age_h=$(( ( $(date +%s) - $(stat -f %m "$latest") ) / 3600 ))
  if [[ "$age_h" -le 36 ]]; then
    ok "Last backup ${age_h}h ago: $latest"
  else
    warn "Last backup is ${age_h}h old: $latest"
  fi
fi

if [[ -d "$data_dir" ]]; then
  ok "Data folder: $data_dir"
fi
echo

if [[ "$failures" -gt 0 ]]; then
  echo "$failures problem(s) to fix, $warnings warning(s)."
  exit 1
fi
echo "All good. $warnings warning(s)."
