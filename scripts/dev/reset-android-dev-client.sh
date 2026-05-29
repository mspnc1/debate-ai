#!/usr/bin/env bash
set -euo pipefail

PACKAGE="${ANDROID_PACKAGE:-com.braveheartinnovations.debateai}"
ACTIVITY="${ANDROID_ACTIVITY:-.MainActivity}"
PORT="${METRO_PORT:-8081}"

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

echo "Force-stopping ${PACKAGE}"
adb -s "$SERIAL" shell am force-stop "$PACKAGE" >/dev/null

echo "Launching ${PACKAGE}/${ACTIVITY}"
adb -s "$SERIAL" shell am start -W -n "${PACKAGE}/${ACTIVITY}"
