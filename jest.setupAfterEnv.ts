import { cleanup } from '@testing-library/react-native';

const ALLOWED_CONSOLE_PATTERNS = [
  /Modal mock missing/,
  /^Account deletion cleanup failed while attempting to /,
  /^Auth signOut failed after account deletion, continuing/,
  /^deleteAccount callable failed/,
  /^Error in purchase error listener/,
  /^Failed to check feature access for /,
  /^Failed to clear debate stats:/,
  /^Failed to fetch store prices:/,
  /^Failed to get feature limit for /,
  /^Failed to load debate stats:/,
  /^Failed to load persisted prices:/,
  /^Failed to load subscription:/,
  /^Failed to open URL:/,
  /^Failed to save debate stats:/,
  /^Failed to update expiry info:/,
  /^ImmutableStateInvariantMiddleware took \d+ms,/,
  /^Persisted prices are stale, will refresh/,
  /^Prices fetched and persisted/,
  /^Test connection failed:/,
  /^\[ChatGPT\] (API test failed|API test successful|Connection test error|Error in OpenAI adapter|Extracted citations from text|request summary|SSE error)/,
  /^\[ClaudeAdapter\] (API Error|Error parsing content_block_delta|SSE error event)/,
  /^\[ConnectionTestService\] /,
  /^\[Crashlytics\] (Crash test is only available|Failed to initialize|Failed to log|Failed to record error|Failed to set attribute|Failed to set attributes|Failed to set user ID|Initialized successfully|Not initialized|Recorded error)/,
  /^\[fileCache\] (Could not resolve image URI|Failed to load base64 from file|Failed to persist image URI|File not found)/,
  /^\[IAP\] (Android:|Ensuring initialized|FAILED to log error to Firestore|Fetching subscriptions|Got subscriptions|Ignoring purchase update|Initialized OK|Logging purchase error to Firestore|Purchase error|Purchase product mismatch|Purchase update missing token|Requesting subscription|SKU:|Successfully logged error to Firestore|User already has subscription data|User authenticated|purchaseSubscription starting|requestSubscription returned)/,
];

const ACT_WARNING_PATTERN = /not wrapped in act/;
const SENSITIVE_CONSOLE_PATTERN = /(sk-ant-[A-Za-z0-9_-]+|sk-[A-Za-z0-9_-]+|pplx-[A-Za-z0-9_-]+|AIza[A-Za-z0-9_-]+|gsk_[A-Za-z0-9_-]+|xai-[A-Za-z0-9_-]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|purchaseToken|lastReceiptData|androidPurchaseToken|apiKey)/i;

const formatConsoleArgs = (args: unknown[]): string => args
  .map((arg) => {
    if (arg instanceof Error) {
      return `${arg.name}: ${arg.message}`;
    }
    if (typeof arg === 'string') {
      return arg;
    }
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  })
  .join(' ');

const isAllowedConsoleMessage = (message: string): boolean => (
  ALLOWED_CONSOLE_PATTERNS.some(pattern => pattern.test(message))
);

let warnSpy: jest.SpyInstance | undefined;
let errorSpy: jest.SpyInstance | undefined;

beforeEach(() => {
  warnSpy = undefined;
  errorSpy = undefined;

  if (!jest.isMockFunction(console.warn)) {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
      const message = formatConsoleArgs(args);
      if (ACT_WARNING_PATTERN.test(message) || SENSITIVE_CONSOLE_PATTERN.test(message)) {
        throw new Error(`Unexpected unsafe console.warn during test: ${message}`);
      }
      if (!isAllowedConsoleMessage(message)) {
        throw new Error(`Unexpected unapproved console.warn during test: ${message}`);
      }
    });
  }

  if (!jest.isMockFunction(console.error)) {
    errorSpy = jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      const message = formatConsoleArgs(args);
      if (ACT_WARNING_PATTERN.test(message) || SENSITIVE_CONSOLE_PATTERN.test(message)) {
        throw new Error(`Unexpected unsafe console.error during test: ${message}`);
      }
      if (!isAllowedConsoleMessage(message)) {
        throw new Error(`Unexpected unapproved console.error during test: ${message}`);
      }
    });
  }
});

afterEach(() => {
  cleanup();
  warnSpy?.mockRestore();
  errorSpy?.mockRestore();
});
