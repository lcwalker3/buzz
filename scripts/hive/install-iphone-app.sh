#!/usr/bin/env bash
# Builds The Hive for your iPhone and installs it, with your community's
# address built in (the welcome screen shows a one-tap "Join" button).
#
#   scripts/hive/install-iphone-app.sh
#
# The iPhone must be paired with this Mac (connected by cable once, or on the
# same Wi-Fi with "Connect via network" on in Xcode) and unlocked. Updating
# keeps the app's sign-in and data. Signing uses the Apple team in
# mobile/ios/Flutter/*.xcconfig (and the gitignored AppOverrides.xcconfig).
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck disable=SC1091
. "$repo_root/bin/activate-hermit" >/dev/null 2>&1 || true

if [[ -z "${HIVE_DEFAULT_COMMUNITY_URL+set}" && -f "$repo_root/.env" ]]; then
  HIVE_DEFAULT_COMMUNITY_URL="$(grep -E '^RELAY_URL=' "$repo_root/.env" | tail -1 | cut -d= -f2- | tr -d "\"'")"
fi
defines=()
if [[ -n "${HIVE_DEFAULT_COMMUNITY_URL:-}" ]]; then
  defines+=(--dart-define="HIVE_DEFAULT_COMMUNITY_URL=$HIVE_DEFAULT_COMMUNITY_URL")
  echo "Built-in community: $HIVE_DEFAULT_COMMUNITY_URL"
fi

# The first paired, available physical iPhone (or HIVE_IPHONE_UDID).
udid="${HIVE_IPHONE_UDID:-$(xcrun devicectl list devices 2>&1 |
  grep iPhone | grep available | grep physical |
  grep -oE '[0-9A-F]{8}-[0-9A-F]{16}' | head -1 || true)}"
[[ -n "$udid" ]] || { echo "No paired iPhone is available: connect and unlock it, then try again." >&2; exit 1; }
echo "iPhone: $udid"

echo "1/3 Building (release, a few minutes)"
(cd "$repo_root/mobile" && flutter build ios --release "${defines[@]}")
app="$(find "$repo_root/mobile/build/ios/iphoneos" -maxdepth 1 -name '*.app' -type d | head -1)"
[[ -n "$app" ]] || { echo "build did not produce an app in mobile/build/ios/iphoneos" >&2; exit 1; }
bundle_id="$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$app/Info.plist")"

echo "2/3 Installing $bundle_id"
xcrun devicectl device install app --device "$udid" "$app"

echo "3/3 Opening it"
xcrun devicectl device process launch --device "$udid" "$bundle_id" >/dev/null ||
  echo "Installed. Unlock the phone and open The Hive."
echo "Done."
