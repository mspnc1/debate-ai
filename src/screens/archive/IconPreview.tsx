import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppLogo } from '../../components/organisms/AppLogo';
import { AppIconGenerator } from '../../components/organisms/AppIconGenerator';
import { Typography } from '../../components/molecules/Typography';
import { useTheme } from '../../theme';
import { Box } from '../../components/atoms/Box';

const IconPreview = () => {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Typography variant="heading" style={styles.title}>Logo & Icon Preview</Typography>
        
        {/* Animated Logo */}
        <Box style={styles.section}>
          <Typography variant="subtitle" style={styles.sectionTitle}>Animated Logo (9 orbiting dots)</Typography>
          <Typography variant="body" style={styles.description}>
            Used in app headers and splash screen
          </Typography>
          <View style={styles.logoContainer}>
            <AppLogo size={200} />
          </View>
        </Box>

        {/* App Icon Final Concepts */}
        <Box style={styles.section}>
          <Typography variant="subtitle" style={styles.sectionTitle}>App Icon Final Concepts</Typography>
          <Typography variant="body" style={styles.description}>
            Two finalists for Symposium AI
          </Typography>
          
          {/* Concept 1: Forum Circle */}
          <Typography variant="subtitle" style={styles.variantTitle}>Option 1: Forum Circle</Typography>
          <Typography variant="caption" style={styles.variantDescription}>
            Nine overlapping circles creating a mandala pattern
          </Typography>
          <View style={styles.iconContainer}>
            <View style={styles.iconWrapper}>
              <AppIconGenerator size={200} />
            </View>
          </View>
          
          {/* Concept 2: Amphitheater */}
          <Typography variant="subtitle" style={styles.variantTitle}>Option 2: Abstract Amphitheater</Typography>
          <Typography variant="caption" style={styles.variantDescription}>
            Vibrant concentric arcs on dark background
          </Typography>
          <View style={styles.iconContainer}>
            <View style={styles.iconWrapper}>
              <AppIconGenerator size={200} />
            </View>
          </View>
          
          {/* Size comparison */}
          <Typography variant="subtitle" style={styles.subsectionTitle}>Size Comparison</Typography>
          <View style={styles.sizeGrid}>
            {/* Forum sizes */}
            <View style={styles.sizeColumn}>
              <Typography variant="caption" style={styles.columnLabel}>Forum Circle</Typography>
              <View style={[styles.iconWrapper, styles.smallIcon]}>
                <AppIconGenerator size={64} />
              </View>
              <View style={[styles.iconWrapper, styles.mediumIcon]}>
                <AppIconGenerator size={128} />
              </View>
            </View>
            
            {/* Amphitheater sizes */}
            <View style={styles.sizeColumn}>
              <Typography variant="caption" style={styles.columnLabel}>Amphitheater</Typography>
              <View style={[styles.iconWrapper, styles.smallIcon]}>
                <AppIconGenerator size={64} />
              </View>
              <View style={[styles.iconWrapper, styles.mediumIcon]}>
                <AppIconGenerator size={128} />
              </View>
            </View>
          </View>
        </Box>

        {/* Color Reference */}
        <Box style={styles.section}>
          <Typography variant="subtitle" style={styles.sectionTitle}>AI Provider Colors</Typography>
          <View style={styles.colorGrid}>
            {[
              { color: '#C15F3C', name: 'Claude' },
              { color: '#10A37F', name: 'ChatGPT' },
              { color: '#4888F8', name: 'Gemini' },
              { color: '#20808D', name: 'Perplexity' },
              { color: '#FA520F', name: 'Mistral' },
              { color: '#FF7759', name: 'Cohere' },
              { color: '#0F6FFF', name: 'Together' },
              { color: '#4D6BFE', name: 'DeepSeek' },
              { color: '#1DA1F2', name: 'Grok' },
            ].map((provider) => (
              <View key={provider.name} style={styles.colorItem}>
                <View style={[styles.colorSwatch, { backgroundColor: provider.color }]} />
                <Typography variant="caption">{provider.name}</Typography>
                <Typography variant="caption" style={styles.colorCode}>{provider.color}</Typography>
              </View>
            ))}
          </View>
        </Box>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 30,
  },
  section: {
    marginBottom: 40,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  subsectionTitle: {
    marginTop: 20,
    marginBottom: 15,
  },
  variantTitle: {
    marginTop: 25,
    marginBottom: 5,
    fontWeight: '600',
  },
  variantDescription: {
    opacity: 0.6,
    marginBottom: 15,
    fontSize: 12,
  },
  description: {
    opacity: 0.7,
    marginBottom: 20,
  },
  logoContainer: {
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  iconWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    backgroundColor: 'white',
  },
  smallIcon: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  mediumIcon: {
    width: 128,
    height: 128,
    borderRadius: 16,
  },
  largeIcon: {
    width: 256,
    height: 256,
    borderRadius: 20,
  },
  sizeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  sizeItem: {
    alignItems: 'center',
  },
  sizeColumn: {
    alignItems: 'center',
    gap: 10,
  },
  columnLabel: {
    marginBottom: 10,
    fontWeight: '600',
  },
  comparisonGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  comparisonItem: {
    alignItems: 'center',
    margin: 10,
  },
  comparisonIcon: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  comparisonLabel: {
    marginTop: 8,
    fontSize: 10,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  colorItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 20,
  },
  colorSwatch: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  colorCode: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 2,
  },
});

export default IconPreview;