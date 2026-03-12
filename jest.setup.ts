import 'whatwg-fetch';
import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';

jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);
jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  // Create a chainable animation mock where any method returns `this`
  const createAnimMock = (): Record<string, jest.Mock> => {
    const mock: Record<string, jest.Mock> = {};
    const handler: ProxyHandler<Record<string, jest.Mock>> = {
      get: (_target, prop) => {
        if (typeof prop === 'string') {
          if (!mock[prop]) {
            mock[prop] = jest.fn().mockReturnValue(new Proxy({}, handler));
          }
          return mock[prop];
        }
        return undefined;
      },
    };
    return new Proxy(mock, handler);
  };
  return {
    __esModule: true,
    default: {
      View,
      Text: require('react-native').Text,
      Image: require('react-native').Image,
      ScrollView: require('react-native').ScrollView,
      FlatList: require('react-native').FlatList,
      createAnimatedComponent: (component: unknown) => component,
    },
    useSharedValue: jest.fn((init: unknown) => ({ value: init })),
    useAnimatedStyle: jest.fn((fn: () => unknown) => fn()),
    useDerivedValue: jest.fn((fn: () => unknown) => ({ value: fn() })),
    useAnimatedScrollHandler: jest.fn(() => jest.fn()),
    withTiming: jest.fn((val: unknown) => val),
    withSpring: jest.fn((val: unknown) => val),
    withDelay: jest.fn((_: unknown, val: unknown) => val),
    withSequence: jest.fn((...vals: unknown[]) => vals[vals.length - 1]),
    withRepeat: jest.fn((val: unknown) => val),
    interpolate: jest.fn(),
    Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
    Extrapolate: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
    Easing: { linear: jest.fn(), ease: jest.fn(), bezier: jest.fn(() => jest.fn()), inOut: jest.fn((v: unknown) => v), in: jest.fn((v: unknown) => v), out: jest.fn((v: unknown) => v) },
    FadeIn: createAnimMock(),
    FadeOut: createAnimMock(),
    FadeInDown: createAnimMock(),
    FadeInUp: createAnimMock(),
    FadeOutUp: createAnimMock(),
    FadeOutDown: createAnimMock(),
    SlideInDown: createAnimMock(),
    SlideInUp: createAnimMock(),
    SlideOutDown: createAnimMock(),
    ZoomIn: createAnimMock(),
    ZoomOut: createAnimMock(),
    Layout: createAnimMock(),
    LinearTransition: createAnimMock(),
    runOnJS: jest.fn((fn: unknown) => fn),
    runOnUI: jest.fn((fn: unknown) => fn),
    cancelAnimation: jest.fn(),
    measure: jest.fn(),
    useAnimatedRef: jest.fn(() => ({ current: null })),
    useAnimatedProps: jest.fn((fn: () => unknown) => fn()),
  };
});
jest.mock('react-native-gesture-handler', () => require('react-native-gesture-handler/jestSetup'));
jest.mock('react-native/Libraries/Modal/Modal', () => {
  const React = require('react');

  const ModalMock = ({ children, visible = true, ...rest }: any = {}) => {
    if (!visible) return null;
    return React.createElement('Modal', { hardwareAccelerated: false, ...rest, visible }, children);
  };

  ModalMock.displayName = 'Modal';
  (ModalMock as unknown as { __esModule?: boolean }).__esModule = true;
  (ModalMock as unknown as { default?: unknown }).default = ModalMock;
  return ModalMock;
});

const modalModule = require('react-native/Libraries/Modal/Modal');
if (!modalModule) {
  // eslint-disable-next-line no-console
  console.warn('Modal mock missing module', modalModule);
} else if (!(modalModule as { default?: unknown }).default) {
  // eslint-disable-next-line no-console
  console.warn('Modal mock missing default', Object.keys(modalModule));
}

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
  getStringAsync: jest.fn(),
}));

jest.mock('expo-file-system/legacy', () => ({
  writeAsStringAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  documentDirectory: '/tmp',
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@react-native-firebase/auth', () => {
  const authInstance = {
    currentUser: null,
  };
  return {
    getAuth: jest.fn(() => authInstance),
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChanged: jest.fn(),
    signInWithCredential: jest.fn(),
    getIdToken: jest.fn(),
    updateProfile: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    GoogleAuthProvider: { credential: jest.fn(() => ({ providerId: 'google' })) },
    AppleAuthProvider: { credential: jest.fn(() => ({ providerId: 'apple' })) },
  };
});

jest.mock('@react-native-firebase/firestore', () => {
  const getFirestore = jest.fn(() => ({}));
  const collection = jest.fn(() => ({}));
  const doc = jest.fn(() => ({}));
  const getDoc = jest.fn();
  const setDoc = jest.fn();
  const onSnapshot = jest.fn();
  const serverTimestamp = jest.fn(() => 'serverTimestamp');
  return { getFirestore, collection, doc, getDoc, setDoc, onSnapshot, serverTimestamp };
});

jest.mock('@react-native-firebase/functions', () => {
  const getFunctions = jest.fn(() => ({}));
  const httpsCallable = jest.fn();
  return { getFunctions, httpsCallable };
});

jest.mock('@react-native-firebase/crashlytics', () => {
  const crashlyticsInstance = {
    setCrashlyticsCollectionEnabled: jest.fn().mockResolvedValue(undefined),
    log: jest.fn(),
    recordError: jest.fn(),
    setUserId: jest.fn(),
    setAttribute: jest.fn(),
    setAttributes: jest.fn(),
    crash: jest.fn(),
  };
  return {
    __esModule: true,
    default: jest.fn(() => crashlyticsInstance),
  };
});

jest.mock('react-native-iap', () => ({
  initConnection: jest.fn(),
  endConnection: jest.fn().mockResolvedValue(undefined),
  purchaseUpdatedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  purchaseErrorListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  fetchProducts: jest.fn(),
  requestPurchase: jest.fn(),
  getAvailablePurchases: jest.fn(),
  finishTransaction: jest.fn(),
}));

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  digestStringAsync: jest.fn().mockResolvedValue('hash'),
}));

jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  saveToLibraryAsync: jest.fn().mockResolvedValue(undefined),
  createAssetAsync: jest.fn().mockResolvedValue({ id: 'mock-asset-id' }),
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
}));

jest.mock('react-native-worklets', () => ({
  createWorklet: jest.fn(),
  useWorklet: jest.fn(),
  createSerializable: jest.fn((val: unknown) => val),
}));

(globalThis as unknown as { __reanimatedWorkletInit?: () => void }).__reanimatedWorkletInit =
  (globalThis as unknown as { __reanimatedWorkletInit?: () => void }).__reanimatedWorkletInit ||
  (() => {});

// Mock useWindowDimensions - individual tests can override with mockReturnValue
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 375, height: 812 })),
}));
