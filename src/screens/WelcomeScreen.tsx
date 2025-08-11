import React, { useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Dimensions,
} from 'react-native';
import { GradientButton } from '../components/core';
import { Text, SafeAreaView } from '../components/atoms';
import { useTheme } from '../theme';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { useDispatch } from 'react-redux';
import { completeOnboarding } from '../store';
import AppLogo from '../components/AppLogo';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface WelcomeScreenProps {
  navigation: {
    replace: (screen: string) => void;
  };
}

// Animated gradient background component
const AnimatedGradientBackground: React.FC = () => {
  const { theme, isDark } = useTheme();
  const animatedOpacity = useSharedValue(0.3);
  
  useEffect(() => {
    animatedOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 3000 }),
        withTiming(0.3, { duration: 3000 })
      ),
      -1,
      true
    );
  }, [animatedOpacity]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: animatedOpacity.value,
  }));
  
  if (!isDark) return null;
  
  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, animatedStyle]}>
      <LinearGradient
        colors={[theme.colors.primary[900], theme.colors.background, theme.colors.background]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
    </Animated.View>
  );
};

const WelcomeScreen: React.FC<WelcomeScreenProps> = () => {
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(50);
  const pulseScale = useSharedValue(1);

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
    
    // Subtle pulse animation for the logo
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2000 }),
        withTiming(1, { duration: 2000 })
      ),
      -1,
      true
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value * pulseScale.value },
    ],
    opacity: opacity.value,
  }));

  const handleGetStarted = () => {
    dispatch(completeOnboarding());
  };

  const features = [
    {
      emoji: '🤖',
      gradient: theme.colors.gradients.ocean,
      title: 'Mix AI Giants with AI Companions',
      description: 'Claude & ChatGPT meet Nomi & Character.AI. Technical brilliance meets personality.',
      highlight: 'NEW',
    },
    {
      emoji: '⚔️',
      gradient: theme.colors.gradients.sunset,
      title: 'AI Debate Arena',
      description: 'Watch AIs battle it out on any topic. Vote for winners. Track championship stats.',
      highlight: 'HOT',
    },
    {
      emoji: '🎭',
      gradient: theme.colors.gradients.forest,
      title: '12 Dynamic Personalities',
      description: 'From Comedian to Philosopher. Each AI adapts to your chosen personality.',
      highlight: null,
    },
    {
      emoji: '🏆',
      gradient: theme.colors.gradients.premium,
      title: 'Premium Power',
      description: 'Unlimited AIs in chat. Expert mode controls. All personalities unlocked.',
      highlight: 'PRO',
    },
    {
      emoji: '📊',
      gradient: theme.colors.gradients.sunrise,
      title: 'Performance Analytics',
      description: 'Track which AI performs best. See win rates, topic mastery, and more.',
      highlight: null,
    },
    {
      emoji: '🎨',
      gradient: theme.colors.gradients.primary,
      title: 'Beautiful Dark Mode',
      description: 'Stunning themes that respect your eyes and your battery.',
      highlight: null,
    },
  ];

  return (
    <SafeAreaView>
      <AnimatedGradientBackground />
      <ScrollView 
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Hero Section */}
        <Animated.View style={[styles.logoContainer, animatedLogoStyle]}>
          <AppLogo size={100} />
          <Text 
            size="4xl" 
            weight="bold" 
            align="center" 
            style={{ 
              marginTop: 20, 
              marginBottom: 8,
            }}
          >
            My AI Friends
          </Text>
          <Text 
            size="lg" 
            color="secondary" 
            align="center"
            style={{ marginBottom: 20 }}
          >
            The Ultimate AI Conversation Platform
          </Text>
          <Text 
            size="sm" 
            align="center"
            style={{ 
              marginBottom: 8,
              fontStyle: 'italic',
              opacity: 0.8
            }}
          >
            Where Intelligence Meets Personality
          </Text>
        </Animated.View>

        {/* Feature Cards Grid */}
        <View style={styles.featuresContainer}>
          {features.map((feature, index) => (
            <Animated.View
              key={feature.title}
              entering={FadeInDown.delay(200 + index * 100).springify()}
              style={[
                styles.featureCard,
                { 
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  shadowColor: theme.colors.shadow,
                  width: (width - 48 - 12) / 2, // Two columns with gap
                }
              ]}
            >
              {feature.highlight && (
                <View style={[
                  styles.highlightBadge,
                  { 
                    backgroundColor: feature.highlight === 'HOT' 
                      ? theme.colors.error[500] 
                      : feature.highlight === 'NEW' 
                      ? theme.colors.success[500]
                      : theme.colors.primary[500]
                  }
                ]}>
                  <Text 
                    size="xs" 
                    weight="bold"
                    color="inverse"
                    style={{ fontSize: 10 }}
                  >
                    {feature.highlight}
                  </Text>
                </View>
              )}
              
              <LinearGradient
                colors={feature.gradient}
                style={styles.featureIconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.featureEmoji}>{feature.emoji}</Text>
              </LinearGradient>
              
              <Text 
                size="md" 
                weight="bold"
                style={{ marginTop: 12, marginBottom: 6 }}
              >
                {feature.title}
              </Text>
              <Text 
                size="xs" 
                style={{ lineHeight: 16, opacity: 0.8 }}
              >
                {feature.description}
              </Text>
            </Animated.View>
          ))}
        </View>

        {/* Premium Banner */}
        <Animated.View 
          entering={FadeInUp.delay(800).springify()}
          style={[
            styles.premiumBanner,
            { 
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.primary[500],
            }
          ]}
        >
          <View style={[StyleSheet.absoluteFillObject, { opacity: 0.1 }]}>
            <LinearGradient
              colors={theme.colors.gradients.premium}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </View>
          <View style={styles.premiumContent}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1 }}>
              <Text style={{ fontSize: 24, marginRight: 12 }}>🚀</Text>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 }}>
                  <Text size="md" weight="bold">
                    Go Premium
                  </Text>
                  <Text 
                    size="sm" 
                    weight="bold"
                    style={{ color: theme.colors.primary[500], marginLeft: 8 }}
                  >
                    $9.99/month
                  </Text>
                </View>
                <View style={{ marginTop: 8 }}>
                  <View style={styles.bulletRow}>
                    <Text size="xs" style={{ color: theme.colors.success[500], marginRight: 6 }}>✓</Text>
                    <Text size="xs" color="secondary" style={{ flex: 1, flexWrap: 'wrap' }}>
                      Group chat with unlimited AIs (Free: max 2)
                    </Text>
                  </View>
                  <View style={styles.bulletRow}>
                    <Text size="xs" style={{ color: theme.colors.success[500], marginRight: 6 }}>✓</Text>
                    <Text size="xs" color="secondary" style={{ flex: 1, flexWrap: 'wrap' }}>
                      All 12 personalities unlocked (Free: Default only)
                    </Text>
                  </View>
                  <View style={styles.bulletRow}>
                    <Text size="xs" style={{ color: theme.colors.success[500], marginRight: 6 }}>✓</Text>
                    <Text size="xs" color="secondary" style={{ flex: 1, flexWrap: 'wrap' }}>
                      Expert mode for precise model configuration
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* CTA Buttons */}
        <Animated.View 
          entering={FadeInDown.delay(1000).springify()}
          style={styles.ctaContainer}
        >
          <GradientButton
            title="Start Your AI Journey"
            onPress={handleGetStarted}
            gradient={theme.colors.gradients.ocean}
            style={{ marginBottom: 12 }}
            fullWidth
          />
          
          <Text 
            size="xs" 
            color="secondary" 
            align="center"
            style={{ marginTop: 8 }}
          >
            No sign-up required • Your API keys stay private • Start free
          </Text>
        </Animated.View>

        {/* Footer Quote */}
        <Animated.View 
          entering={FadeIn.delay(1200)}
          style={styles.footer}
        >
          <Text 
            size="sm" 
            color="secondary" 
            align="center"
            style={{ fontStyle: 'italic' }}
          >
            "The future isn't about replacing human connection.{'\n'}
            It's about enhancing it."
          </Text>
          <Text 
            size="xs" 
            color="secondary" 
            align="center"
            style={{ marginTop: 16 }}
          >
            Built with ❤️ for the AI revolution
          </Text>
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 30,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  featureCard: {
    borderRadius: 16,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  highlightBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 1,
  },
  featureIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureEmoji: {
    fontSize: 28,
  },
  premiumBanner: {
    borderRadius: 16,
    padding: 20,
    paddingVertical: 24,
    marginBottom: 24,
    borderWidth: 2,
    overflow: 'visible',
    minHeight: 160,
  },
  premiumContent: {
    flexDirection: 'column',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  ctaContainer: {
    marginBottom: 24,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingBottom: 20,
  },
});

export default WelcomeScreen;