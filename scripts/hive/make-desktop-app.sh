#!/usr/bin/env bash
# Builds The Hive iPhone app for the iOS Simulator and puts a "The Hive" app on
# the Desktop. Double-clicking it opens the full iPhone app in a Simulator
# window on this Mac, connected to your Hive like the phone is.
#
#   scripts/hive/make-desktop-app.sh
#
# Re-run after pulling new code to update the Desktop copy. Your sign-in and
# messages in the Simulator are kept between updates.
# Needs Xcode (with an iOS Simulator) and the repo's Hermit toolchain.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
app_home="${HIVE_DATA_DIR:-$HOME/Library/Application Support/TheHive}/desktop"
launcher="${HIVE_LAUNCHER_PATH:-$HOME/Desktop/The Hive.app}"

# shellcheck disable=SC1091
. "$repo_root/bin/activate-hermit" >/dev/null 2>&1 || true

echo "1/4 Building the app for the Simulator (a few minutes the first time)"
(cd "$repo_root/mobile" && flutter build ios --simulator --debug)
built="$repo_root/mobile/build/ios/iphonesimulator/Runner.app"
[[ -d "$built" ]] || { echo "build did not produce $built" >&2; exit 1; }
bundle_id="$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$built/Info.plist")"

echo "2/4 Copying it to $app_home"
mkdir -p "$app_home"
rm -rf "$app_home/The Hive.app"
cp -R "$built" "$app_home/The Hive.app"

# Newer Xcode ships the Simulator as DeviceHub.app.
developer_dir="$(xcode-select -p)"
simulator_app="$developer_dir/../Applications/DeviceHub.app"
[[ -d "$simulator_app" ]] || simulator_app="$developer_dir/Applications/Simulator.app"

echo "3/4 Writing the launcher script"
cat > "$app_home/launch.sh" <<LAUNCH
#!/bin/bash
# Opens The Hive in the iOS Simulator. Written by make-desktop-app.sh.
set -euo pipefail
app="$app_home/The Hive.app"
bundle_id="$bundle_id"
log="\$HOME/Library/Logs/TheHive/desktop-app.log"
mkdir -p "\$(dirname "\$log")"
exec >>"\$log" 2>&1
echo "--- \$(date) launching The Hive"
# Use an iPhone simulator that is already running, or start the first one.
udid="\$(xcrun simctl list devices available | awk -F '[()]' '/iPhone/ && /Booted/ {print \$2; exit}')"
if [[ -z "\$udid" ]]; then
  udid="\$(xcrun simctl list devices available | awk -F '[()]' '/iPhone/ {print \$2; exit}')"
  [[ -n "\$udid" ]] || { osascript -e 'display alert "The Hive" message "No iPhone simulator found. Open Xcode > Settings > Components and install an iOS Simulator."'; exit 1; }
  xcrun simctl boot "\$udid"
fi
open -a "$simulator_app" --args -CurrentDeviceUDID "\$udid"
xcrun simctl bootstatus "\$udid" -b >/dev/null
xcrun simctl install "\$udid" "\$app"
xcrun simctl launch "\$udid" "\$bundle_id"
LAUNCH
chmod +x "$app_home/launch.sh"

echo "4/4 Creating $launcher"
rm -rf "$launcher"
script_path="$app_home/launch.sh"
osacompile -o "$launcher" -e "do shell script quoted form of \"$script_path\" & \" > /dev/null 2>&1 &\""

# Give the launcher The Hive icon, made from the iPhone app icon.
icon_src="$(ls "$repo_root"/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/*1024*.png 2>/dev/null | head -1 || true)"
if [[ -n "$icon_src" ]]; then
  iconset="$(mktemp -d)/TheHive.iconset"
  mkdir -p "$iconset"
  for size in 16 32 128 256 512; do
    sips -z "$size" "$size" "$icon_src" --out "$iconset/icon_${size}x${size}.png" >/dev/null
    sips -z $((size * 2)) $((size * 2)) "$icon_src" --out "$iconset/icon_${size}x${size}@2x.png" >/dev/null
  done
  iconutil -c icns "$iconset" -o "$launcher/Contents/Resources/applet.icns"
  rm -rf "$(dirname "$iconset")"
  touch "$launcher"
fi

echo
echo "Done. Double-click \"$(basename "$launcher")\" on your Desktop to open The Hive."
