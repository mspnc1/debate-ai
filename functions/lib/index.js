"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExportJob = exports.runExportJob = exports.appleAuthCallback = exports.symposiumFeedback = exports.contactForm = exports.exportUserData = exports.recordImageGeneration = exports.getUsageStats = exports.getProviderBalances = exports.stripeWebhook = exports.cancelStripeSubscription = exports.createStripeBillingPortal = exports.createStripeCheckoutSession = exports.executeTool = exports.proxyImageGeneration = exports.proxyAIRequestStreamV2 = exports.proxyAIRequestStream = exports.proxyAIRequest = exports.getConfiguredDataServices = exports.deleteDataServiceKey = exports.saveDataServiceKey = exports.getConfiguredProviders = exports.deleteApiKey = exports.saveApiKey = exports.deleteAccount = exports.handleAppStoreNotification = exports.handlePlayStoreNotification = exports.validatePurchase = void 0;
var validatePurchase_1 = require("./validatePurchase");
Object.defineProperty(exports, "validatePurchase", { enumerable: true, get: function () { return validatePurchase_1.validatePurchase; } });
var playStore_1 = require("./notifications/playStore");
Object.defineProperty(exports, "handlePlayStoreNotification", { enumerable: true, get: function () { return playStore_1.handlePlayStoreNotification; } });
var appStore_1 = require("./notifications/appStore");
Object.defineProperty(exports, "handleAppStoreNotification", { enumerable: true, get: function () { return appStore_1.handleAppStoreNotification; } });
var deleteAccount_1 = require("./deleteAccount");
Object.defineProperty(exports, "deleteAccount", { enumerable: true, get: function () { return deleteAccount_1.deleteAccount; } });
// API Key Management
var apiKeys_1 = require("./apiKeys");
Object.defineProperty(exports, "saveApiKey", { enumerable: true, get: function () { return apiKeys_1.saveApiKey; } });
Object.defineProperty(exports, "deleteApiKey", { enumerable: true, get: function () { return apiKeys_1.deleteApiKey; } });
Object.defineProperty(exports, "getConfiguredProviders", { enumerable: true, get: function () { return apiKeys_1.getConfiguredProviders; } });
// Data Connector Key Management
var dataConnectors_1 = require("./dataConnectors");
Object.defineProperty(exports, "saveDataServiceKey", { enumerable: true, get: function () { return dataConnectors_1.saveDataServiceKey; } });
Object.defineProperty(exports, "deleteDataServiceKey", { enumerable: true, get: function () { return dataConnectors_1.deleteDataServiceKey; } });
Object.defineProperty(exports, "getConfiguredDataServices", { enumerable: true, get: function () { return dataConnectors_1.getConfiguredDataServices; } });
// AI Proxy
var aiProxy_1 = require("./aiProxy");
Object.defineProperty(exports, "proxyAIRequest", { enumerable: true, get: function () { return aiProxy_1.proxyAIRequest; } });
var aiProxyStream_1 = require("./aiProxyStream");
Object.defineProperty(exports, "proxyAIRequestStream", { enumerable: true, get: function () { return aiProxyStream_1.proxyAIRequestStream; } });
var aiProxyStreamV2_1 = require("./aiProxyStreamV2");
Object.defineProperty(exports, "proxyAIRequestStreamV2", { enumerable: true, get: function () { return aiProxyStreamV2_1.proxyAIRequestStreamV2; } });
// Image Generation Proxy
var imageProxy_1 = require("./imageProxy");
Object.defineProperty(exports, "proxyImageGeneration", { enumerable: true, get: function () { return imageProxy_1.proxyImageGeneration; } });
// Tool Execution (all server tools route through executeTool)
var tools_1 = require("./tools");
Object.defineProperty(exports, "executeTool", { enumerable: true, get: function () { return tools_1.executeTool; } });
// Stripe (Web Subscriptions)
var stripe_1 = require("./stripe");
Object.defineProperty(exports, "createStripeCheckoutSession", { enumerable: true, get: function () { return stripe_1.createStripeCheckoutSession; } });
Object.defineProperty(exports, "createStripeBillingPortal", { enumerable: true, get: function () { return stripe_1.createStripeBillingPortal; } });
Object.defineProperty(exports, "cancelStripeSubscription", { enumerable: true, get: function () { return stripe_1.cancelStripeSubscription; } });
Object.defineProperty(exports, "stripeWebhook", { enumerable: true, get: function () { return stripe_1.stripeWebhook; } });
// Usage Tracking
var usageTracking_1 = require("./usageTracking");
Object.defineProperty(exports, "getProviderBalances", { enumerable: true, get: function () { return usageTracking_1.getProviderBalances; } });
Object.defineProperty(exports, "getUsageStats", { enumerable: true, get: function () { return usageTracking_1.getUsageStats; } });
Object.defineProperty(exports, "recordImageGeneration", { enumerable: true, get: function () { return usageTracking_1.recordImageGeneration; } });
// GDPR User Data Export
var userData_1 = require("./userData");
Object.defineProperty(exports, "exportUserData", { enumerable: true, get: function () { return userData_1.exportUserData; } });
// Braveheart Contact Form
var contactForm_1 = require("./contactForm");
Object.defineProperty(exports, "contactForm", { enumerable: true, get: function () { return contactForm_1.contactForm; } });
// Symposium AI Feedback
var symposiumFeedback_1 = require("./symposiumFeedback");
Object.defineProperty(exports, "symposiumFeedback", { enumerable: true, get: function () { return symposiumFeedback_1.symposiumFeedback; } });
// Apple Sign In Callback (handles form_post from Apple)
var appleAuthCallback_1 = require("./appleAuthCallback");
Object.defineProperty(exports, "appleAuthCallback", { enumerable: true, get: function () { return appleAuthCallback_1.appleAuthCallback; } });
// Export Pipeline (M4)
var runExportJob_1 = require("./exports/runExportJob");
Object.defineProperty(exports, "runExportJob", { enumerable: true, get: function () { return runExportJob_1.runExportJob; } });
var createExportJob_1 = require("./exports/createExportJob");
Object.defineProperty(exports, "createExportJob", { enumerable: true, get: function () { return createExportJob_1.createExportJob; } });
