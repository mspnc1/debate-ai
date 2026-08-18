const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin to keep @react-native-firebase on CocoaPods-resolved
 * Firebase instead of Swift Package Manager.
 *
 * react-native-firebase v26 resolves firebase-ios-sdk via SPM by default.
 * Its SPM products are automatic (non-dynamic) libraries, so with
 * `use_frameworks! :linkage => :static` (required by expo-build-properties
 * for this project) each RNFB pod embeds its own Firebase copy and the app
 * fails to link with duplicate-symbol errors. Setting $RNFirebaseDisableSPM
 * opts back into the CocoaPods distribution, which supports static linkage.
 */
module.exports = function withRNFirebaseNoSPM(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      let podfile = fs.readFileSync(podfilePath, 'utf8');

      if (!podfile.includes('$RNFirebaseDisableSPM')) {
        podfile = `$RNFirebaseDisableSPM = true\n\n${podfile}`;
        fs.writeFileSync(podfilePath, podfile);
      }

      return config;
    },
  ]);
};
