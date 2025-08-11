import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Text } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { ThemedText } from '../core';
import { useTheme } from '../../theme';
import { UNIVERSAL_PERSONALITIES } from '../../config/personalities';
import { PersonalityBadge } from './PersonalityBadge';
import * as Haptics from 'expo-haptics';

interface PersonalityPickerProps {
  currentPersonalityId: string;
  onSelectPersonality: (personalityId: string) => void;
  isPremium: boolean;
  aiName: string;
}

export const PersonalityPicker: React.FC<PersonalityPickerProps> = ({
  currentPersonalityId,
  onSelectPersonality,
  isPremium,
}) => {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  
  const currentPersonality = UNIVERSAL_PERSONALITIES.find(p => p.id === currentPersonalityId) || UNIVERSAL_PERSONALITIES[0];
  
  const handleSelect = (personalityId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectPersonality(personalityId);
    setIsOpen(false);
  };
  
  const availablePersonalities = isPremium 
    ? UNIVERSAL_PERSONALITIES 
    : UNIVERSAL_PERSONALITIES.filter(p => p.id === 'default');
  
  return (
    <View style={styles.container}>
      <PersonalityBadge
        personalityName={currentPersonality.name}
        onPress={() => setIsOpen(!isOpen)}
        isPremium={isPremium}
        isLocked={false}
      />
      
      {isOpen && (
        <Animated.View 
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={[
            styles.dropdown,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.shadow,
            }
          ]}
        >
          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {availablePersonalities.map((personality) => (
              <TouchableOpacity
                key={personality.id}
                onPress={() => handleSelect(personality.id)}
                style={[
                  styles.option,
                  currentPersonalityId === personality.id && {
                    backgroundColor: theme.colors.primary[100],
                  }
                ]}
              >
                <View style={styles.optionContent}>
                  <ThemedText 
                    weight={currentPersonalityId === personality.id ? 'bold' : 'medium'}
                    style={{ fontSize: 14 }}
                  >
                    {personality.name}
                  </ThemedText>
                  <ThemedText 
                    variant="caption" 
                    color="secondary"
                    style={{ fontSize: 11, marginTop: 2 }}
                  >
                    {personality.description}
                  </ThemedText>
                </View>
                {currentPersonalityId === personality.id && (
                  <Text style={[styles.checkmark, { color: theme.colors.primary[600] }]}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
            
            {!isPremium && UNIVERSAL_PERSONALITIES.length > 1 && (
              <View style={[styles.premiumSection, { borderTopColor: theme.colors.border }]}>
                <ThemedText variant="caption" color="secondary" align="center">
                  🔒 {UNIVERSAL_PERSONALITIES.length - 1} more personalities
                </ThemedText>
                <ThemedText variant="caption" color="secondary" align="center" style={{ marginTop: 4 }}>
                  Available with Premium
                </ThemedText>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 9999,
  },
  dropdown: {
    position: 'absolute',
    top: 30,
    left: -20,
    width: 250,
    maxHeight: 400,
    borderRadius: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 9999,
  },
  scrollView: {
    borderRadius: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionContent: {
    flex: 1,
    marginRight: 8,
  },
  checkmark: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  premiumSection: {
    borderTopWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 8,
  },
});