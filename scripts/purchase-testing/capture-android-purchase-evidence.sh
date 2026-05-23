#!/usr/bin/env bash
set -euo pipefail

ADB="${ADB:-/Users/michaelspencer/Library/Android/sdk/platform-tools/adb}"
PACKAGE="${PACKAGE:-com.braveheartinnovations.debateai}"
NODE_BIN_PATH="${NODE_BIN_PATH:-/Users/michaelspencer/.nvm/versions/node/v22.17.0/bin}"
PROJECT="${PROJECT:-symposium-ai}"
CHANNEL="${CHANNEL:-production}"
TIMESTAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
OUT_DIR="${OUT_DIR:-.purchase-test-runs/$TIMESTAMP}"
SERIAL=""
CLEAR_LOGS=0

usage() {
  cat <<USAGE
Capture Android purchase-flow evidence from a connected device.

Usage:
  bash scripts/purchase-testing/capture-android-purchase-evidence.sh [--serial SERIAL] [--out DIR] [--clear]

Options:
  --serial SERIAL  adb device serial. If omitted, the script uses the only connected device.
  --out DIR        output directory. Default: .purchase-test-runs/<utc-timestamp>
  --clear          clear device logcat first, wait for you to reproduce the purchase, then capture.

Environment:
  ADB      adb path. Default: $ADB
  PACKAGE  Android package. Default: $PACKAGE
  PROJECT  Firebase project. Default: $PROJECT
  CHANNEL  EAS update channel. Default: $CHANNEL
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --serial)
      SERIAL="${2:-}"
      shift 2
      ;;
    --out)
      OUT_DIR="${2:-}"
      shift 2
      ;;
    --clear)
      CLEAR_LOGS=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ ! -x "$ADB" ]]; then
  echo "adb not found or not executable: $ADB" >&2
  exit 1
fi

if [[ -z "$SERIAL" ]]; then
  DEVICES="$("$ADB" devices -l | awk 'NR > 1 && $2 == "device" { print $0 }')"
  DEVICE_COUNT="$(printf "%s\n" "$DEVICES" | sed '/^[[:space:]]*$/d' | wc -l | tr -d ' ')"
  if [[ "$DEVICE_COUNT" != "1" ]]; then
    echo "Expected exactly one connected adb device; found $DEVICE_COUNT." >&2
    "$ADB" devices -l >&2
    exit 1
  fi
  SERIAL="$(printf "%s\n" "$DEVICES" | awk 'NR == 1 { print $1 }')"
fi

mkdir -p "$OUT_DIR"

run_capture() {
  local file="$1"
  shift
  {
    echo "$ $*"
    "$@"
  } > "$OUT_DIR/$file" 2>&1 || true
}

filter_file() {
  local source_file="$1"
  local dest_file="$2"
  local pattern="$3"
  if command -v rg >/dev/null 2>&1; then
    rg -i "$pattern" "$source_file" > "$OUT_DIR/$dest_file" 2>&1 || true
  else
    grep -Eai "$pattern" "$source_file" > "$OUT_DIR/$dest_file" 2>&1 || true
  fi
}

{
  echo "timestamp_utc=$TIMESTAMP"
  echo "serial=$SERIAL"
  echo "package=$PACKAGE"
  echo "project=$PROJECT"
  echo "channel=$CHANNEL"
} > "$OUT_DIR/context.txt"

CURRENT_USER="$("$ADB" -s "$SERIAL" shell am get-current-user 2>/dev/null | tr -d '\r' || true)"
PACKAGE_UID=""
if [[ -n "$CURRENT_USER" ]]; then
  PACKAGE_UID="$("$ADB" -s "$SERIAL" shell cmd package list packages -U --user "$CURRENT_USER" "$PACKAGE" 2>/dev/null | sed -n 's/.* uid://p' | tr -d '\r' || true)"
  {
    echo "android_user=$CURRENT_USER"
    echo "package_uid=$PACKAGE_UID"
  } >> "$OUT_DIR/context.txt"
fi

run_capture adb-devices.txt "$ADB" devices -l
run_capture package-dumpsys.txt "$ADB" -s "$SERIAL" shell dumpsys package "$PACKAGE"
filter_file "$OUT_DIR/package-dumpsys.txt" package-summary.txt "versionName|versionCode|firstInstallTime|lastUpdateTime|installerPackageName"

if [[ "$CLEAR_LOGS" == "1" ]]; then
  "$ADB" -s "$SERIAL" logcat -c
  echo "Cleared logcat on $SERIAL."
  echo "Reproduce the purchase failure on the device, then press Enter here to capture logs."
  read -r _
fi

if [[ -n "$PACKAGE_UID" ]]; then
  PID="$("$ADB" -s "$SERIAL" shell ps -A -o UID,PID,NAME 2>/dev/null | awk -v uid="$PACKAGE_UID" -v pkg="$PACKAGE" '$1 == uid && $3 == pkg { print $2; exit }' | tr -d '\r' || true)"
else
  PID="$("$ADB" -s "$SERIAL" shell pidof -s "$PACKAGE" 2>/dev/null | tr -d '\r' || true)"
fi
echo "$PID" > "$OUT_DIR/app-pid.txt"

run_capture logcat-full.txt "$ADB" -s "$SERIAL" logcat -d -v time
if [[ -n "$PID" ]]; then
  run_capture app-logcat.txt "$ADB" -s "$SERIAL" logcat -d --pid "$PID" -v time
else
  echo "App process not running; app-logcat.txt not captured." > "$OUT_DIR/app-logcat.txt"
fi

filter_file "$OUT_DIR/logcat-full.txt" billing-logcat.txt "Billing|BillingClient|BillingResult|ProxyBillingActivity|purchase|premium_(annual|monthly|lifetime)|DEVELOPER_ERROR|ITEM_ALREADY_OWNED|ITEM_UNAVAILABLE|SERVICE_UNAVAILABLE|BAD_AUTHENTICATION|Unable to resolve host|firestore|validatePurchase|expo-updates|No static field"

run_capture network-firestore.txt "$ADB" -s "$SERIAL" shell ping -c 1 firestore.googleapis.com
run_capture network-play.txt "$ADB" -s "$SERIAL" shell ping -c 1 play.googleapis.com
run_capture connectivity.txt "$ADB" -s "$SERIAL" shell dumpsys connectivity

if PATH="$NODE_BIN_PATH:$PATH" command -v firebase >/dev/null 2>&1; then
  run_capture validatePurchase.log env PATH="$NODE_BIN_PATH:$PATH" firebase functions:log --only validatePurchase --project "$PROJECT" -n 50
  run_capture handlePlayStoreNotification.log env PATH="$NODE_BIN_PATH:$PATH" firebase functions:log --only handlePlayStoreNotification --project "$PROJECT" -n 50
else
  echo "firebase CLI not found in PATH." > "$OUT_DIR/validatePurchase.log"
  echo "firebase CLI not found in PATH." > "$OUT_DIR/handlePlayStoreNotification.log"
fi

if PATH="$NODE_BIN_PATH:$PATH" command -v eas >/dev/null 2>&1; then
  run_capture eas-channel.txt env PATH="$NODE_BIN_PATH:$PATH" eas channel:view "$CHANNEL" --json --non-interactive
else
  echo "eas CLI not found in PATH." > "$OUT_DIR/eas-channel.txt"
fi

cat > "$OUT_DIR/README.txt" <<README
Android purchase evidence captured for $PACKAGE on $SERIAL.

Start with:
  context.txt
  package-summary.txt
  billing-logcat.txt
  app-logcat.txt
  validatePurchase.log
  handlePlayStoreNotification.log

If billing-logcat shows ITEM_ALREADY_OWNED or restore behavior, check the Play Store
account and subscription state. If validatePurchase.log has no matching invocation,
the failure happened before the backend callable.
README

echo "Captured Android purchase evidence in: $OUT_DIR"
