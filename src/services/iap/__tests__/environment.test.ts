import { Platform } from 'react-native';

const mockDeviceState = { isDevice: true };

jest.mock('expo-device', () => ({
  get isDevice() {
    return mockDeviceState.isDevice;
  },
}));

import {
  isAndroidEmulatorStoreUnavailable,
  isIOSSimulatorStoreUnavailable,
  isStorePurchaseUnavailableInCurrentEnvironment,
} from '../environment';

const originalOSDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
const originalConstantsDescriptor = Object.getOwnPropertyDescriptor(Platform, 'constants');

function setPlatformOS(os: typeof Platform.OS): void {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

function setPlatformConstants(constants: Record<string, unknown>): void {
  Object.defineProperty(Platform, 'constants', { value: constants, configurable: true });
}

describe('iap environment detection', () => {
  beforeEach(() => {
    mockDeviceState.isDevice = true;
    setPlatformOS('ios');
    setPlatformConstants({});
  });

  afterEach(() => {
    mockDeviceState.isDevice = true;
    if (originalOSDescriptor) {
      Object.defineProperty(Platform, 'OS', originalOSDescriptor);
    }
    if (originalConstantsDescriptor) {
      Object.defineProperty(Platform, 'constants', originalConstantsDescriptor);
    }
  });

  it('detects Android emulators from expo-device', () => {
    setPlatformOS('android');
    mockDeviceState.isDevice = false;

    expect(isAndroidEmulatorStoreUnavailable()).toBe(true);
    expect(isStorePurchaseUnavailableInCurrentEnvironment()).toBe(true);
  });

  it('detects Android emulator build constants when expo-device reports a device', () => {
    setPlatformOS('android');
    mockDeviceState.isDevice = true;
    setPlatformConstants({
      Brand: 'google',
      Fingerprint: 'google/sdk_gphone64_arm64/emu64a:16/BP22/release-keys',
      Hardware: 'ranchu',
      Model: 'sdk_gphone64_arm64',
      Product: 'sdk_gphone64_arm64',
    });

    expect(isAndroidEmulatorStoreUnavailable()).toBe(true);
  });

  it('allows physical Android devices', () => {
    setPlatformOS('android');
    mockDeviceState.isDevice = true;
    setPlatformConstants({
      Brand: 'google',
      Fingerprint: 'google/caiman/caiman:16/BP22/release-keys',
      Hardware: 'caiman',
      Model: 'Pixel 9 Pro',
      Product: 'caiman',
    });

    expect(isAndroidEmulatorStoreUnavailable()).toBe(false);
    expect(isStorePurchaseUnavailableInCurrentEnvironment()).toBe(false);
  });

  it('detects iOS simulators', () => {
    setPlatformOS('ios');
    mockDeviceState.isDevice = false;

    expect(isIOSSimulatorStoreUnavailable()).toBe(true);
    expect(isStorePurchaseUnavailableInCurrentEnvironment()).toBe(true);
  });

  it('allows physical iOS devices', () => {
    setPlatformOS('ios');
    mockDeviceState.isDevice = true;

    expect(isIOSSimulatorStoreUnavailable()).toBe(false);
    expect(isStorePurchaseUnavailableInCurrentEnvironment()).toBe(false);
  });
});
