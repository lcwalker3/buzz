#!/usr/bin/env bash
# Runs The Hive relay from this checkout (used by the launchd agent).
# Reads secrets/config from the repo's gitignored .env.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

if [[ ! -f .env ]]; then
  echo "run-relay: missing $repo_root/.env" >&2
  exit 1
fi
set -o allexport
# shellcheck disable=SC1091
source .env
set +o allexport

# Persistent data lives outside the repo so a re-clone never loses it.
data_dir="${HIVE_DATA_DIR:-$HOME/Library/Application Support/TheHive}"
mkdir -p "$data_dir/git" "$data_dir/git-pack-cache"
export BUZZ_GIT_REPO_PATH="${BUZZ_GIT_REPO_PATH:-$data_dir/git}"
export BUZZ_GIT_PACK_CACHE_PATH="${BUZZ_GIT_PACK_CACHE_PATH:-$data_dir/git-pack-cache}"

# Serve the web client from the same origin when it has been built.
if [[ -z "${BUZZ_WEB_DIR:-}" && -f web/dist/index.html ]]; then
  export BUZZ_WEB_DIR="$repo_root/web/dist"
fi

exec "$repo_root/target/release/buzz-relay"
