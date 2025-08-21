import React from 'react';
import { AppRegistry, View } from 'react-native';
import { AppIconGenerator } from '../../components/organisms/AppIconGenerator';

// This utility can be used to generate the app icon
// Run with: npx react-native-svg-to-png (if needed)

const IconExporter = () => {
  return (
    <View style={{ flex: 1, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' }}>
      <AppIconGenerator size={1024} />
    </View>
  );
};

// Register for potential screenshot/export
AppRegistry.registerComponent('IconExporter', () => IconExporter);

export default IconExporter;