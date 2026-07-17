import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Typography } from '@/components/molecules';
import type { CreateTab } from '@/types/media';

const TABS: Array<{ id: CreateTab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'image', label: 'Image', icon: 'image-outline' },
  { id: 'video', label: 'Video', icon: 'videocam-outline' },
  { id: 'audio', label: 'Audio', icon: 'musical-notes-outline' },
];

/** The Studio's media-type switcher (Image / Video / Audio). */
export const CreateMediaTabs: React.FC<{
  activeTab: CreateTab;
  onChange: (tab: CreateTab) => void;
  testID?: string;
}> = ({ activeTab, onChange, testID }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.tabRow, { backgroundColor: theme.colors.surface }]} testID={testID}>
      {TABS.map(tab => {
        const isSelected = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabButton,
              { backgroundColor: isSelected ? theme.colors.primary[500] : 'transparent' },
            ]}
            onPress={() => onChange(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            testID={testID ? `${testID}-${tab.id}` : undefined}
          >
            <Ionicons
              name={tab.icon}
              size={18}
              color={isSelected ? '#FFFFFF' : theme.colors.text.secondary}
            />
            <Typography
              variant="caption"
              weight="semibold"
              style={{ color: isSelected ? '#FFFFFF' : theme.colors.text.primary }}
            >
              {tab.label}
            </Typography>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});

export default CreateMediaTabs;
