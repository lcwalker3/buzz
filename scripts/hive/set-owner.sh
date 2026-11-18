#!/usr/bin/env bash
# Makes a key the owner of your main Hive community.
#
#   scripts/hive/set-owner.sh npub1...        # or the 64-character hex key
#
# Accepts the public key exactly as the iPhone app copies it (npub...),
# converts it to the hex form the relay needs, saves RELAY_OWNER_PUBKEY in
# .env (keeping a backup of the old file) and restarts the relay.
# Set HIVE_NO_RESTART=1 to skip the restart.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
env_file="${HIVE_ENV_FILE:-$repo_root/.env}"
key="${1:-}"
[[ -n "$key" ]] || { echo "usage: $0 <npub or 64-character hex public key>" >&2; exit 1; }
[[ -f "$env_file" ]] || { echo "no .env at $env_file" >&2; exit 1; }

hex="$(python3 - "$key" <<'PY'
import sys

CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"

def polymod(values):
    gen = [0x3B6A57B2, 0x26508E6D, 0x1EA119FA, 0x3D4233DD, 0x2A1462B3]
    chk = 1
    for v in values:
        top = chk >> 25
        chk = (chk & 0x1FFFFFF) << 5 ^ v
        for i in range(5):
            chk ^= gen[i] if ((top >> i) & 1) else 0
    return chk

def npub_to_hex(s):
    s = s.strip().lower()
    hrp, sep, data = s.rpartition("1")
    if hrp != "npub" or not data:
        raise ValueError("not an npub")
    values = [CHARSET.index(c) for c in data]
    expanded = [ord(c) >> 5 for c in hrp] + [0] + [ord(c) & 31 for c in hrp]
    if polymod(expanded + values) != 1:
        raise ValueError("checksum does not match (was the key copied completely?)")
    acc = bits = 0
    out = []
    for v in values[:-6]:
        acc = (acc << 5) | v
        bits += 5
        while bits >= 8:
            bits -= 8
            out.append((acc >> bits) & 0xFF)
    if len(out) != 32:
        raise ValueError("wrong length")
    return bytes(out).hex()

key = sys.argv[1].strip()
try:
    if key.lower().startswith("npub1"):
        print(npub_to_hex(key))
    elif len(key) == 64 and all(c in "0123456789abcdefABCDEF" for c in key):
        print(key.lower())
    else:
        raise ValueError("expected an npub1... key or 64 hex characters")
except ValueError as error:
    print(f"error: {error}", file=sys.stderr)
    sys.exit(1)
PY
)"

backup="$env_file.before-set-owner"
cp -p "$env_file" "$backup"
if grep -q '^RELAY_OWNER_PUBKEY=' "$env_file"; then
  sed -i '' "s/^RELAY_OWNER_PUBKEY=.*/RELAY_OWNER_PUBKEY=$hex/" "$env_file"
else
  printf '\n# Owner of the main community (set by scripts/hive/set-owner.sh)\nRELAY_OWNER_PUBKEY=%s\n' "$hex" >> "$env_file"
fi
echo "Owner set to $hex (old .env saved as $(basename "$backup"))"

if [[ "${HIVE_NO_RESTART:-}" != "1" ]]; then
  launchctl kickstart -k "gui/$(id -u)/com.thehive.relay"
  echo "Relay restarted. Check with scripts/hive/doctor.sh"
fi
