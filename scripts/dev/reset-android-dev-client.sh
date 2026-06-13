#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
PACKAGE="${ANDROID_PACKAGE:-com.braveheartinnovations.debateai}"
ACTIVITY="${ANDROID_ACTIVITY:-.MainActivity}"
PORT="${METRO_PORT:-8081}"
BUNDLE_WARMUP="${METRO_BUNDLE_WARMUP:-1}"
BUNDLE_WARMUP_TIMEOUT="${METRO_BUNDLE_WARMUP_TIMEOUT:-120}"
EXPECTED_VERSION_CODE="${ANDROID_EXPECTED_VERSION_CODE:-}"

if [ -z "$EXPECTED_VERSION_CODE" ] && [ -f "${REPO_ROOT}/android/app/build.gradle" ]; then
  EXPECTED_VERSION_CODE="$(awk '/versionCode[[:space:]]+[0-9]+/ { print $2; exit }' "${REPO_ROOT}/android/app/build.gradle")"
fi

if ! command -v adb >/dev/null 2>&1; then
  echo "adb is not available on PATH." >&2
  exit 1
fi

if [ -n "${ANDROID_SERIAL:-}" ]; then
  SERIAL="$ANDROID_SERIAL"
else
  SERIAL="$(adb devices | awk 'NR > 1 && $2 == "device" { print $1; exit }')"
fi

if [ -z "${SERIAL:-}" ]; then
  echo "No connected Android emulator/device found." >&2
  echo "Start an emulator, then run this command again." >&2
  exit 1
fi

METRO_STATUS="$(curl -fsS "http://127.0.0.1:${PORT}/status" 2>/dev/null || true)"
if [ "$METRO_STATUS" != "packager-status:running" ]; then
  echo "Metro is not reachable on port ${PORT}." >&2
  echo "Start Metro first with: npm start" >&2
  exit 1
fi

echo "Using Android target: ${SERIAL}"
echo "Restoring adb reverse tcp:${PORT} -> tcp:${PORT}"
adb -s "$SERIAL" reverse "tcp:${PORT}" "tcp:${PORT}" >/dev/null

if ! adb -s "$SERIAL" shell cmd package resolve-activity --brief "$PACKAGE" | grep -q "${PACKAGE}/"; then
  echo "The dev client package is not installed or its launcher activity is not resolvable: ${PACKAGE}" >&2
  echo "Install it first with: npm run android" >&2
  exit 1
fi

INSTALLED_VERSION_CODE="$(adb -s "$SERIAL" shell dumpsys package "$PACKAGE" | awk -F'versionCode=' '/versionCode=/ { split($2, parts, " "); print parts[1]; exit }')"
if [ -n "$EXPECTED_VERSION_CODE" ] && [ -n "$INSTALLED_VERSION_CODE" ] && [ "$INSTALLED_VERSION_CODE" != "$EXPECTED_VERSION_CODE" ]; then
  echo "Installed dev client versionCode ${INSTALLED_VERSION_CODE} does not match local Android versionCode ${EXPECTED_VERSION_CODE}." >&2
  echo "Reinstall the current native client, then rerun this command:" >&2
  echo "  cd android && ANDROID_SERIAL=${SERIAL} ./gradlew :app:installDebug --console=plain" >&2
  exit 1
fi

if [ "$BUNDLE_WARMUP" != "0" ]; then
  BUNDLE_TMP="$(mktemp "${TMPDIR:-/tmp}/debateai-android-bundle.XXXXXX")"
  trap 'rm -f "$BUNDLE_TMP"' EXIT
  BUNDLE_URL="http://127.0.0.1:${PORT}/index.bundle?platform=android&dev=true&minify=false"

  echo "Warming Android Metro bundle"
  if ! curl -fsS --max-time "$BUNDLE_WARMUP_TIMEOUT" -o "$BUNDLE_TMP" "$BUNDLE_URL"; then
    echo "Metro is reachable, but Android bundle generation failed or timed out." >&2
    echo "Check the Metro terminal output, then rerun this command." >&2
    echo "To skip bundle warmup: METRO_BUNDLE_WARMUP=0 npm run android:dev:reset" >&2
    exit 1
  fi
fi

echo "Force-stopping ${PACKAGE}"
adb -s "$SERIAL" shell am force-stop "$PACKAGE" >/dev/null

echo "Launching ${PACKAGE}/${ACTIVITY}"
adb -s "$SERIAL" shell am start -W -n "${PACKAGE}/${ACTIVITY}"
