import { Platform } from 'react-native';
import * as Device from 'expo-device';

export function isAndroidEmulatorStoreUnavailable(): boolean {
  return Platform.OS === 'android' && !Device.isDevice;
}
