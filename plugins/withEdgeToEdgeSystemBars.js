const { AndroidConfig, withAndroidStyles } = require('@expo/config-plugins');

const APP_THEME = AndroidConfig.Styles.getAppThemeGroup();

const SYSTEM_BAR_STYLE_ITEMS = [
  {
    name: 'android:windowLightNavigationBar',
    value: 'false',
    targetApi: '27',
  },
  {
    name: 'android:windowBackground',
    value: '@android:color/black',
  },
  {
    name: 'android:enforceNavigationBarContrast',
    value: 'false',
    targetApi: '29',
  },
  {
    name: 'android:navigationBarDividerColor',
    value: '@android:color/black',
    targetApi: '28',
  },
  {
    name: 'android:windowLayoutInDisplayCutoutMode',
    value: 'shortEdges',
    targetApi: '28',
  },
];

module.exports = function withEdgeToEdgeSystemBars(config) {
  return withAndroidStyles(config, (config) => {
    let styles = config.modResults;

    SYSTEM_BAR_STYLE_ITEMS.forEach((item) => {
      styles = AndroidConfig.Styles.assignStylesValue(styles, {
        add: true,
        parent: APP_THEME,
        ...item,
      });
    });

    config.modResults = styles;
    return config;
  });
};
