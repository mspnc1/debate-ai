export { validatePurchase } from './validatePurchase';
export { handlePlayStoreNotification } from './notifications/playStore';
export { handleAppStoreNotification } from './notifications/appStore';
export { deleteAccount } from './deleteAccount';
export {
  checkLoginRateLimit,
  verifyEmailPasswordSignIn,
  clearLoginAttempts,
  checkPasswordResetRateLimit,
  requestPasswordResetEmail,
} from './authRateLimiting';

// API Key Management
export { saveApiKey, deleteApiKey, getConfiguredProviders } from './apiKeys';

// Data Connector Key Management
export { saveDataServiceKey, deleteDataServiceKey, getConfiguredDataServices } from './dataConnectors';

// AI Proxy
export { proxyAIRequest } from './aiProxy';
export { proxyAIRequestStream } from './aiProxyStream';
export { proxyAIRequestStreamV2 } from './aiProxyStreamV2';

// Image Generation Proxy
export { proxyImageGeneration } from './imageProxy';

// Media Generation Proxy
export {
  proxyMediaGeneration,
  getMediaTaskStatus,
  listMediaProviderOptions,
} from './mediaProxy';
export {
  createDebateAudioCompileSession,
  compileDebateAudioPack,
} from './debateAudioCompile';

// Tool Execution (all server tools route through executeTool)
export { executeTool } from './tools';
export {
  refreshSalesforceDocsIndex,
  scheduledSalesforceDocsIndexRefresh,
} from './salesforceDocsIndex';

// Stripe (Web Subscriptions)
export {
  createStripeCheckoutSession,
  createStripeBillingPortal,
  cancelStripeSubscription,
  stripeWebhook,
} from './stripe';

// Usage Tracking
export {
  getProviderBalances,
  getUsageStats,
  recordFreeTierInteraction,
  recordImageGeneration,
  recordMediaGeneration,
} from './usageTracking';

// Cloud payload storage quota/reservation management
export {
  reserveCloudPayloadUpload,
  finalizeCloudPayloadUpload,
  deleteCloudPayload,
  deleteCloudPayloadsForPath,
  deleteUserCloudData,
} from './cloudPayloadStorage';

// GDPR User Data Export
export { exportUserData } from './userData';

// Braveheart Contact Form
export { contactForm } from './contactForm';

// Symposium AI Feedback
export { symposiumFeedback } from './symposiumFeedback';

// In-app AI content reports
export { reportGeneratedContent } from './reportGeneratedContent';

// Apple Sign In Callback (handles form_post from Apple)
export { appleAuthCallback } from './appleAuthCallback';

// Export Pipeline (M4)
export { runExportJob } from './exports/runExportJob';
export { createExportJob } from './exports/createExportJob';
export { createHtmlPdfExport } from './exports/createHtmlPdfExport';
