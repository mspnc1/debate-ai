const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Expo config plugin to add missingDimensionStrategy for react-native-iap.
 * react-native-iap has 'amazon' and 'play' product flavors — this tells
 * Gradle to default to the 'play' (Google Play) variant.
 */
module.exports = function withPlayStoreIAP(config) {
  return withAppBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;

    if (!buildGradle.includes("missingDimensionStrategy 'store'")) {
      config.modResults.contents = buildGradle.replace(
        /versionName\s+"[^"]+"/,
        `$&\n        missingDimensionStrategy 'store', 'play'`
      );
    }

    return config;
  });
};
