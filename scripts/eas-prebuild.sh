#!/bin/bash
# EAS post-install hook to decode Firebase config files from EAS secrets.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "=== EAS Pre-build: Setting up Firebase configs ==="

should_configure_platform() {
  local platform="$1"
  local current_platform="${EAS_BUILD_PLATFORM:-}"

  if [ -z "$current_platform" ] || [ "$current_platform" = "$platform" ]; then
    return 0
  fi

  return 1
}

decode_secret_to_file() {
  local secret_name="$1"
  local output_path="$2"
  local value="${!secret_name:-}"

  if [ -z "$value" ]; then
    echo "Warning: $secret_name not set"
    return 0
  fi

  mkdir -p "$(dirname "$output_path")"
  printf '%s' "$value" | base64 --decode > "$output_path"
  echo "Created $output_path"
}

resolve_ios_google_services_path() {
  if [ -d "ios/SymposiumAI" ]; then
    printf '%s\n' "ios/SymposiumAI/GoogleService-Info.plist"
    return 0
  fi

  local app_dir
  app_dir="$(
    find ios -maxdepth 1 -mindepth 1 -type d \
      ! -name "Pods" \
      ! -name "build" \
      ! -name "*.xcodeproj" \
      ! -name "*.xcworkspace" \
      | head -n 1
  )"

  if [ -n "$app_dir" ]; then
    printf '%s/GoogleService-Info.plist\n' "$app_dir"
    return 0
  fi

  return 1
}

if should_configure_platform "android"; then
  echo "Decoding google-services.json..."
  decode_secret_to_file "GOOGLE_SERVICES_JSON_BASE64" "android/app/google-services.json"
else
  echo "Skipping Android Firebase config for EAS_BUILD_PLATFORM=${EAS_BUILD_PLATFORM:-unknown}"
fi

if should_configure_platform "ios"; then
  ios_google_services_path="$(resolve_ios_google_services_path)" || {
    echo "Warning: Could not find an iOS app target directory for GoogleService-Info.plist"
    ios_google_services_path=""
  }

  if [ -n "$ios_google_services_path" ]; then
    echo "Decoding GoogleService-Info.plist..."
    decode_secret_to_file "GOOGLE_SERVICE_INFO_PLIST_BASE64" "$ios_google_services_path"
  fi
else
  echo "Skipping iOS Firebase config for EAS_BUILD_PLATFORM=${EAS_BUILD_PLATFORM:-unknown}"
fi

echo "=== Firebase config setup complete ==="
