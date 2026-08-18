const { withAndroidManifest, withMainApplication, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin that installs the Play Billing crash guards
 * (see commit 96da8ec "fix: guard malformed billing proxy intents").
 *
 * Prebuild regenerates MainApplication.kt / AndroidManifest.xml and removes
 * unmanaged files from the java source tree, so these customizations must be
 * reapplied by a plugin rather than committed to android/ directly:
 * 1. Copies BillingFlowFallbackActivity.kt and BillingProxyActivityGuard.kt
 *    from plugins/android-src/ into the app package.
 * 2. Declares BillingFlowFallbackActivity in AndroidManifest.xml.
 * 3. Registers BillingProxyActivityGuard in MainApplication.onCreate.
 */

const PACKAGE_DIR = 'com/braveheartinnovations/debateai';
const KT_FILES = ['BillingFlowFallbackActivity.kt', 'BillingProxyActivityGuard.kt'];

function withBillingKotlinSources(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const srcDir = path.join(config.modRequest.projectRoot, 'plugins', 'android-src');
      const destDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'java',
        PACKAGE_DIR
      );
      for (const file of KT_FILES) {
        fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
      }
      return config;
    },
  ]);
}

function withBillingFallbackActivity(config) {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application?.[0];
    if (!app) {
      return config;
    }
    app.activity = app.activity || [];
    const name = '.BillingFlowFallbackActivity';
    if (!app.activity.some((a) => a.$?.['android:name'] === name)) {
      app.activity.push({
        $: {
          'android:name': name,
          'android:theme': '@android:style/Theme.NoDisplay',
          'android:exported': 'false',
          'android:noHistory': 'true',
          'android:excludeFromRecents': 'true',
        },
      });
    }
    return config;
  });
}

function withBillingGuardRegistration(config) {
  return withMainApplication(config, (config) => {
    const src = config.modResults.contents;
    const marker = 'BillingProxyActivityGuard.register(this)';
    if (!src.includes(marker)) {
      config.modResults.contents = src.replace(
        /(override fun onCreate\(\) \{\n\s*super\.onCreate\(\)\n)/,
        `$1    ${marker}\n`
      );
    }
    return config;
  });
}

module.exports = function withBillingProxyGuard(config) {
  config = withBillingKotlinSources(config);
  config = withBillingFallbackActivity(config);
  config = withBillingGuardRegistration(config);
  return config;
};
