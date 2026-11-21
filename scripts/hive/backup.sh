#!/usr/bin/env bash
# Backs up The Hive: the database, stored files, git repositories and the
# secrets needed to run it, into one dated folder. Keeps the last 14 days.
#
#   scripts/hive/backup.sh
#
# Backups go to ~/HiveBackups (override with HIVE_BACKUP_DIR, e.g. a folder on
# an external drive). The folder holds secrets (.env and keys), so it is made
# private to this user; keep any copy on an encrypted disk.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# The nightly job runs an installed copy of this script and names the .env
# to use, so it keeps working whichever checkout installed it.
env_file="${HIVE_ENV_FILE:-$repo_root/.env}"
[[ -f "$env_file" ]] || { echo "backup: no .env at $env_file" >&2; exit 1; }
set -o allexport
# shellcheck disable=SC1090
source "$env_file"
set +o allexport

data_dir="${HIVE_DATA_DIR:-$HOME/Library/Application Support/TheHive}"
backup_dir="${HIVE_BACKUP_DIR:-$HOME/HiveBackups}"
keep_days="${HIVE_BACKUP_KEEP_DAYS:-14}"
stamp="$(date +%Y-%m-%d_%H%M%S)"
dest="$backup_dir/$stamp"
partial="$backup_dir/.partial-$stamp"

pg_dump="$(command -v pg_dump || true)"
for candidate in /opt/homebrew/opt/postgresql@17/bin/pg_dump /usr/local/opt/postgresql@17/bin/pg_dump; do
  [[ -x "$candidate" ]] && pg_dump="$candidate" && break
done
[[ -n "$pg_dump" ]] || { echo "backup: pg_dump not found (brew install postgresql@17)" >&2; exit 1; }
[[ -n "${DATABASE_URL:-}" ]] || { echo "backup: DATABASE_URL is not set in .env" >&2; exit 1; }

umask 077
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
# Write into a hidden folder and rename at the end, so a failed run never
# looks like a good backup.
mkdir -p "$partial"
trap 'rm -rf "$partial"' EXIT

echo "backup: database"
"$pg_dump" --format=custom --file "$partial/database.dump" "$DATABASE_URL"

for part in s3 git; do
  if [[ -d "$data_dir/$part" ]]; then
    echo "backup: $part"
    rsync -a "$data_dir/$part/" "$partial/$part/"
  fi
done

echo "backup: secrets"
mkdir -p "$partial/secrets"
cp -p "$env_file" "$partial/secrets/env"
for key in "$data_dir"/*.key; do
  [[ -f "$key" ]] && cp -p "$key" "$partial/secrets/"
done
if [[ -d "$data_dir/agents" ]]; then
  rsync -a "$data_dir/agents/" "$partial/secrets/agents/"
fi

{
  echo "The Hive backup $stamp"
  echo "Restore: see docs/hive/backups.md"
  echo
  (cd "$partial" && du -sh -- * 2>/dev/null)
} > "$partial/README.txt"

mv "$partial" "$dest"
trap - EXIT
echo "backup: saved $dest ($(du -sh "$dest" | awk '{print $1}'))"

# Prune old backups (only folders this script created).
find "$backup_dir" -maxdepth 1 -type d -name '20??-??-??_??????' -mtime +"$keep_days" -print -exec rm -rf {} + |
  sed 's/^/backup: removed old /'
