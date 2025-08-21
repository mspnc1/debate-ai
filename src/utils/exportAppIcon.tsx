import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { AppIconGenerator } from '../components/organisms/AppIconGenerator';
import { Button } from '../components/molecules';

/**
 * Utility component to export the app icon at various resolutions
 * This can be used to generate the actual icon files needed for app stores
 */
export const ExportAppIcon: React.FC = () => {
  const viewShotRefs = React.useRef<{ [key: string]: ViewShot | null }>({});
  
  const iconSizes = [
    { name: 'icon', size: 1024, desc: 'Main app icon' },
    { name: 'icon@2x', size: 512, desc: 'App icon @2x' },
    { name: 'adaptive-icon', size: 1024, desc: 'Android adaptive icon' },
    { name: 'splash-icon', size: 512, desc: 'Splash screen icon' },
    { name: 'favicon', size: 48, desc: 'Web favicon' },
  ];

  const captureIcon = async (name: string, size: number) => {
    try {
      const viewShot = viewShotRefs.current[`${name}-${size}`];
      if (!viewShot) {
        Alert.alert('Error', `ViewShot ref not found for ${name}`);
        return;
      }

      const uri = await viewShot.capture?.();
      if (!uri) {
        Alert.alert('Error', `Failed to capture ${name}`);
        return;
      }
      
      // Save to a more permanent location
      const fileName = `${name}-${size}.png`;
      const newUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.copyAsync({ from: uri, to: newUri });
      
      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newUri);
      } else {
        Alert.alert('Success', `Icon saved to: ${newUri}`);
      }
    } catch (error) {
      console.error('Error capturing icon:', error);
      Alert.alert('Error', `Failed to capture ${name}: ${error}`);
    }
  };

  const captureAllIcons = async () => {
    for (const { name, size } of iconSizes) {
      await captureIcon(name, size);
    }
    Alert.alert('Complete', 'All icons have been exported');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Export App Icons</Text>
      <Text style={styles.description}>
        Generate icon files at different resolutions for app stores and web
      </Text>
      
      <View style={styles.iconsContainer}>
        {iconSizes.map(({ name, size, desc }) => (
          <View key={`${name}-${size}`} style={styles.iconItem}>
            <Text style={styles.iconLabel}>{desc}</Text>
            <Text style={styles.iconSize}>{size}x{size}px</Text>
            <ViewShot
              ref={(ref) => { viewShotRefs.current[`${name}-${size}`] = ref; }}
              options={{ format: 'png', quality: 1 }}
              style={{ width: Math.min(size, 200), height: Math.min(size, 200) }}
            >
              <AppIconGenerator size={size} />
            </ViewShot>
            <Button
              title="Export"
              onPress={() => captureIcon(name, size)}
              variant="secondary"
              size="small"
              style={styles.exportButton}
            />
          </View>
        ))}
      </View>
      
      <Button
        title="Export All Icons"
        onPress={captureAllIcons}
        variant="primary"
        style={styles.exportAllButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  iconsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  iconItem: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 10,
  },
  iconLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  iconSize: {
    fontSize: 10,
    color: '#666',
    marginBottom: 8,
  },
  exportButton: {
    marginTop: 8,
  },
  exportAllButton: {
    marginTop: 20,
  },
});