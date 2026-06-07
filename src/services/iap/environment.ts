import { Platform } from 'react-native';
import * as Device from 'expo-device';

type AndroidPlatformConstants = {
  Brand?: unknown;
  Manufacturer?: unknown;
  Model?: unknown;
  Fingerprint?: unknown;
  Hardware?: unknown;
  Product?: unknown;
  Device?: unknown;
};

const ANDROID_EMULATOR_MARKERS = [
  'android sdk built for',
  'emulator',
  'generic',
  'goldfish',
  'google_sdk',
  'ranchu',
  'sdk_gphone',
  'sdk_google',
];

function hasAndroidEmulatorMarker(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.toLowerCase();
  return ANDROID_EMULATOR_MARKERS.some((marker) => normalized.includes(marker));
}

export function isAndroidEmulatorStoreUnavailable(): boolean {
  if (Platform.OS !== 'android') {
    return false;
  }

  if (Device.isDevice === false) {
    return true;
  }

  const constants = Platform.constants as AndroidPlatformConstants | undefined;
  return [
    constants?.Brand,
    constants?.Manufacturer,
    constants?.Model,
    constants?.Fingerprint,
    constants?.Hardware,
    constants?.Product,
    constants?.Device,
  ].some(hasAndroidEmulatorMarker);
}

export function isIOSSimulatorStoreUnavailable(): boolean {
  return Platform.OS === 'ios' && Device.isDevice === false;
}

export function isStorePurchaseUnavailableInCurrentEnvironment(): boolean {
  return isAndroidEmulatorStoreUnavailable() || isIOSSimulatorStoreUnavailable();
}
