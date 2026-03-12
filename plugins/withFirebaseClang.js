const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin to fix Firebase pod build errors with Xcode 26.
 *
 * Xcode 26 + static frameworks causes two issues in @react-native-firebase pods:
 * 1. Cross-module RCTBridgeModule re-declaration — fix with CLANG_ENABLE_MODULES = NO
 * 2. C23 implicit-int errors — fix with GCC_C_LANGUAGE_STANDARD = gnu11 + warning suppression
 */
module.exports = function withFirebaseClang(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      let podfile = fs.readFileSync(podfilePath, 'utf8');

      const snippet = `
  # Fix Firebase build errors with Xcode 26 (SDK 55)
  post_install do |installer|
    installer.pods_project.targets.each do |target|
      if target.name.start_with?('RNFB') || target.name.include?('react-native-firebase')
        target.build_configurations.each do |config|
          config.build_settings['CLANG_ENABLE_MODULES'] = 'NO'
          config.build_settings['GCC_C_LANGUAGE_STANDARD'] = 'gnu11'
          config.build_settings['OTHER_CFLAGS'] ||= '$(inherited)'
          config.build_settings['OTHER_CFLAGS'] += ' -Wno-error=implicit-int -Wno-implicit-int'
        end
      end
    end
  end`;

      // Only add if not already present
      if (!podfile.includes('RNFB') || !podfile.includes('CLANG_ENABLE_MODULES')) {
        // Check if there's already a post_install block we should merge into
        if (podfile.includes('post_install do |installer|')) {
          // Inject our target loop into the existing post_install block
          const innerSnippet = `
    # Fix Firebase build errors with Xcode 26 (SDK 55)
    installer.pods_project.targets.each do |target|
      if target.name.start_with?('RNFB') || target.name.include?('react-native-firebase')
        target.build_configurations.each do |config|
          config.build_settings['CLANG_ENABLE_MODULES'] = 'NO'
          config.build_settings['GCC_C_LANGUAGE_STANDARD'] = 'gnu11'
          config.build_settings['OTHER_CFLAGS'] ||= '$(inherited)'
          config.build_settings['OTHER_CFLAGS'] += ' -Wno-error=implicit-int -Wno-implicit-int'
        end
      end
    end`;
          podfile = podfile.replace(
            'post_install do |installer|',
            `post_install do |installer|${innerSnippet}`
          );
        } else {
          // Append a new post_install block at the end
          podfile += `\n${snippet}\n`;
        }

        fs.writeFileSync(podfilePath, podfile, 'utf8');
      }

      return config;
    },
  ]);
};
