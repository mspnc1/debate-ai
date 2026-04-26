type IapModule = typeof import('react-native-iap');

let iapModulePromise: Promise<IapModule> | null = null;
let loadedIapModule: IapModule | null = null;

export function getIapModule(): Promise<IapModule> {
  if (!iapModulePromise) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Lazy native import defers Nitro/IAP side effects until the store path is actually used.
    loadedIapModule = require('react-native-iap') as IapModule;
    iapModulePromise = Promise.resolve(loadedIapModule);
  }
  return iapModulePromise;
}

export function hasRequestedIapModule(): boolean {
  return iapModulePromise !== null;
}

export function getLoadedIapModule(): IapModule | null {
  return loadedIapModule;
}
