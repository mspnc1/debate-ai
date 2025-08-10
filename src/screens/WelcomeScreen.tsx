import React, { useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
} from 'react-native';
import { 
  ThemedView, 
  ThemedText, 
  ThemedButton, 
  ThemedSafeAreaView,
  GradientButton 
} from '../components/core';
import { useTheme } from '../theme';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { useDispatch } from 'react-redux';
import { completeOnboarding } from '../store';
import AppLogo from '../components/AppLogo';

// const { height } = Dimensions.get('window');  // Uncomment if needed later

interface WelcomeScreenProps {
  navigation: {
    replace: (screen: string) => void;
  };
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = () => {
  const dispatch = useDispatch();
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(50);

  useEffect(() => {
    scale.value = withSpring(1, {
      damping: 12,
      stiffness: 100,
    });
    opacity.value = withTiming(1, { duration: 800 });
    translateY.value = withSpring(0, {
      damping: 15,
      stiffness: 100,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handleGetStarted = () => {
    dispatch(completeOnboarding());
    // Navigation will happen automatically due to conditional rendering in AppNavigator
  };

  const handleLookAround = () => {
    dispatch(completeOnboarding());
    // Navigation will happen automatically due to conditional rendering in AppNavigator
  };

  return (
    <ThemedSafeAreaView>
      <ScrollView 
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        bounces={true}
        scrollEnabled={true}
      >
        {/* Logo and Title */}
        <Animated.View style={[styles.logoContainer, animatedLogoStyle]}>
          <AppLogo size={120} />
          <ThemedText variant="heading" align="center" style={{ marginTop: 20, marginBottom: 8 }}>
            My AI Friends
          </ThemedText>
          <ThemedText variant="body" color="secondary" align="center">
            Where artificial intelligence meets{'\n'}actual conversation
          </ThemedText>
        </Animated.View>

        {/* Feature Cards */}
        <Animated.View 
          entering={FadeInDown.delay(400).springify()}
          style={styles.featuresContainer}
        >
          <ThemedView style={[
            styles.featureCard,
            { 
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.shadow,
            }
          ]}>
            <ThemedView style={[
              styles.featureIcon,
              { backgroundColor: isDark ? theme.colors.gray[800] : theme.colors.gray[100] }
            ]}>
              <ThemedText style={styles.featureEmoji}>💬</ThemedText>
            </ThemedView>
            <ThemedView style={styles.featureContent}>
              <ThemedText variant="subtitle" weight="semibold">
                Multi-AI Conversations
              </ThemedText>
              <ThemedText variant="body" color="secondary" style={{ marginTop: 4 }}>
                Chat with Claude, ChatGPT, and Gemini at once. 
                Like a group chat where everyone actually has something smart to say.
              </ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView style={[
            styles.featureCard,
            { 
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.shadow,
            }
          ]}>
            <ThemedView style={[
              styles.featureIcon,
              { backgroundColor: isDark ? theme.colors.gray[800] : theme.colors.gray[100] }
            ]}>
              <ThemedText style={styles.featureEmoji}>🎭</ThemedText>
            </ThemedView>
            <ThemedView style={styles.featureContent}>
              <ThemedText variant="subtitle" weight="semibold">
                Personality Modes
              </ThemedText>
              <ThemedText variant="body" color="secondary" style={{ marginTop: 4 }}>
                From professor to comedian to therapist. 
                It's like having multiple personalities, but productive.
              </ThemedText>
            </ThemedView>
          </ThemedView>

          <ThemedView style={[
            styles.featureCard,
            { 
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.shadow,
            }
          ]}>
            <ThemedView style={[
              styles.featureIcon,
              { backgroundColor: isDark ? theme.colors.gray[800] : theme.colors.gray[100] }
            ]}>
              <ThemedText style={styles.featureEmoji}>🎯</ThemedText>
            </ThemedView>
            <ThemedView style={styles.featureContent}>
              <ThemedText variant="subtitle" weight="semibold">
                Simple or Expert
              </ThemedText>
              <ThemedText variant="body" color="secondary" style={{ marginTop: 4 }}>
                Start easy, go deep when you're ready. 
                Like Instagram filters vs. Photoshop.
              </ThemedText>
            </ThemedView>
          </ThemedView>
        </Animated.View>

        {/* CTA Buttons */}
        <Animated.View 
          entering={FadeInDown.delay(600).springify()}
          style={styles.ctaContainer}
        >
          <GradientButton
            title="Let's do this"
            onPress={handleGetStarted}
            gradient={isDark ? theme.colors.gradients.premium : theme.colors.gradients.ocean}
            style={{ marginBottom: 12 }}
          />
          
          <ThemedButton
            title="I need a minute"
            onPress={handleLookAround}
            variant="secondary"
            size="large"
            fullWidth
          />
        </Animated.View>

        {/* Footer */}
        <Animated.View 
          entering={FadeIn.delay(800)}
          style={styles.footer}
        >
          <ThemedText variant="caption" color="secondary" align="center">
            No ads. No tracking. No BS.{'\n'}
            Just AI conversations that don't suck.
          </ThemedText>
        </Animated.View>

      </ScrollView>
    </ThemedSafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  featuresContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  featureCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureEmoji: {
    fontSize: 24,
  },
  featureContent: {
    flex: 1,
  },
  ctaContainer: {
    marginTop: 20,
    marginBottom: 24,
    paddingHorizontal: 0,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingBottom: 20,
  },
});

export default WelcomeScreen;