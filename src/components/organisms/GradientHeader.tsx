import React, { useEffect, useState } from 'react';
import { StyleSheet, ViewStyle, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { Box } from '../atoms';
import { Typography } from '../molecules';
import { useTheme, Theme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export const HEADER_HEIGHT = 65;

export const GradientHeader: React.FC<GradientHeaderProps> = ({
  title,
  subtitle,
  style,
  children,
}) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Animation values
  const gradientAnimation = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(15);
  const geometryAnimation = useSharedValue(0);
  const floatingAnimation = useSharedValue(0);
  
  // Get time-based greeting
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Good night';
  };
  
  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    // Subtle gradient breathing animation
    gradientAnimation.value = withRepeat(
      withTiming(1, {
        duration: 10000,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );
    
    // Geometric shape animation
    geometryAnimation.value = withRepeat(
      withTiming(1, {
        duration: 15000,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );
    
    // Floating elements animation
    floatingAnimation.value = withRepeat(
      withTiming(1, {
        duration: 4000,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );
    
    // Text entrance animations
    titleOpacity.value = withTiming(1, { duration: 800 });
    titleTranslateY.value = withTiming(0, { 
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
    
    subtitleOpacity.value = withTiming(1, { 
      duration: 1000,
      easing: Easing.out(Easing.quad),
    });
    subtitleTranslateY.value = withTiming(0, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
    });
  }, [floatingAnimation, geometryAnimation, gradientAnimation, subtitleOpacity, subtitleTranslateY, titleOpacity, titleTranslateY]);
  
  
  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));
  
  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }],
  }));
  
  const geometryAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ 
      translateY: interpolate(geometryAnimation.value, [0, 1], [-10, 10])
    }]
  }));
  
  const floatingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ 
      translateY: interpolate(floatingAnimation.value, [0, 1], [-5, 5])
    }]
  }));
  
  const totalHeight = HEADER_HEIGHT + insets.top;
  
  // Theme-based spacing and sizing
  const contentPadding = theme.spacing.lg;
  const dateBottomMargin = theme.spacing.xs; // Increased spacing between date and greeting
  const titleBottomMargin = 2; // Small spacing between greeting messages
  
  // Get theme-appropriate gradients
  const primaryGradient = isDark 
    ? [theme.colors.gradients.primary[0], theme.colors.gradients.primary[1], theme.colors.primary[700] as string]
    : [theme.colors.gradients.primary[0], theme.colors.gradients.premium[1], theme.colors.gradients.sunrise[0] as string];
    
  const accentGradient = isDark
    ? [theme.colors.gradients.ocean[0], theme.colors.gradients.forest[1]]
    : [theme.colors.gradients.sunset[0], theme.colors.gradients.ocean[1]];

  const styles = createStyles(theme, contentPadding);
  
  return (
    <Box style={[styles.container, { height: totalHeight }, style]}>
      {/* Wave-shaped mask for the entire header */}
      <Svg 
        width={SCREEN_WIDTH} 
        height={totalHeight} 
        style={StyleSheet.absoluteFillObject}
      >
        <Defs>
          <SvgGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            {primaryGradient.map((color, index) => (
              <Stop 
                key={index} 
                offset={`${index * 50}%`} 
                stopColor={color} 
              />
            ))}
          </SvgGradient>
        </Defs>
        
        {/* Header shape with wave bottom */}
        <Path
          d={`M0,0 
              L${SCREEN_WIDTH},0
              L${SCREEN_WIDTH},${totalHeight - 10}
              Q${SCREEN_WIDTH * 0.75},${totalHeight - 5} ${SCREEN_WIDTH * 0.5},${totalHeight - 8}
              Q${SCREEN_WIDTH * 0.25},${totalHeight - 3} 0,${totalHeight - 12}
              Z`}
          fill="url(#headerGradient)"
        />
      </Svg>
      
      {/* Geometric SVG Shapes with modern curved design */}
      <Box style={styles.geometryContainer}>
        <Animated.View style={[styles.geometryLayer, geometryAnimatedStyle]}>
          <Svg width={SCREEN_WIDTH} height={totalHeight} style={StyleSheet.absoluteFillObject}>
            <Defs>
              <SvgGradient id="accent1" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={accentGradient[0]} stopOpacity="0.3" />
                <Stop offset="100%" stopColor={accentGradient[1]} stopOpacity="0.15" />
              </SvgGradient>
              <SvgGradient id="accent2" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={theme.colors.text.inverse} stopOpacity="0.1" />
                <Stop offset="100%" stopColor={theme.colors.text.inverse} stopOpacity="0.05" />
              </SvgGradient>
            </Defs>
            
            {/* Dramatic diagonal cut with curved corner */}
            <Path
              d={`M0,0 
                  L${SCREEN_WIDTH * 0.6},0
                  Q${SCREEN_WIDTH * 0.75},0 ${SCREEN_WIDTH * 0.85},${totalHeight * 0.25}
                  Q${SCREEN_WIDTH * 0.95},${totalHeight * 0.45} ${SCREEN_WIDTH},${totalHeight * 0.65}
                  L${SCREEN_WIDTH},${totalHeight}
                  L0,${totalHeight}
                  Z`}
              fill={theme.colors.background}
              opacity={isDark ? 0.15 : 0.1}
            />
            
            {/* Wave-like accent shape */}
            <Path
              d={`M0,${totalHeight * 0.3}
                  C${SCREEN_WIDTH * 0.15},${totalHeight * 0.2}
                  ${SCREEN_WIDTH * 0.35},${totalHeight * 0.6}
                  ${SCREEN_WIDTH * 0.6},${totalHeight * 0.4}
                  C${SCREEN_WIDTH * 0.8},${totalHeight * 0.25}
                  ${SCREEN_WIDTH * 0.9},${totalHeight * 0.6}
                  ${SCREEN_WIDTH},${totalHeight * 0.5}
                  L${SCREEN_WIDTH},${totalHeight}
                  Q${SCREEN_WIDTH * 0.7},${totalHeight * 0.92} ${SCREEN_WIDTH * 0.3},${totalHeight * 0.96}
                  Q0,${totalHeight} 0,${totalHeight * 0.9}
                  Z`}
              fill="url(#accent2)"
            />
          </Svg>
        </Animated.View>
      </Box>
      
      {/* Floating accent elements */}
      <Animated.View style={[styles.floatingElements, floatingAnimatedStyle]}>
        <Box style={[styles.floatingCircle, styles.circle1, { 
          backgroundColor: theme.colors.text.inverse,
          opacity: isDark ? 0.06 : 0.08
        }]} />
        <Box style={[styles.floatingCircle, styles.circle2, { 
          backgroundColor: theme.colors.text.inverse,
          opacity: isDark ? 0.04 : 0.06
        }]} />
        <Box style={[styles.floatingCircle, styles.circle3, { 
          backgroundColor: theme.colors.text.inverse,
          opacity: isDark ? 0.08 : 0.1
        }]} />
      </Animated.View>
      
      {/* Content */}
      <Box style={styles.content}>
        {/* Time in top right */}
        <Box style={[styles.timeContainer, { 
          top: insets.top + theme.spacing.sm, // Increased top padding to align with date
          right: contentPadding 
        }]}>
          <Typography 
            variant="body" 
            weight="bold"
            color="inverse"
            style={styles.timeText}
          >
            {currentTime.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            })}
          </Typography>
        </Box>
        
        {/* Main content area - positioned at top */}
        <Box style={styles.mainContent}>
          {/* Date positioned above greeting */}
          <Box style={[styles.dateContainer, { marginBottom: dateBottomMargin }]}>
            <Typography 
              variant="body" 
              weight="bold"
              color="inverse"
              style={styles.dateText}
            >
              {currentTime.toLocaleDateString('en-US', { 
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
            </Typography>
          </Box>
          
          <Animated.View style={titleAnimatedStyle}>
            <Typography
              variant="heading"
              weight="bold"
              color="inverse"
              style={{ ...styles.title, marginBottom: titleBottomMargin }}
            >
              {title || getGreeting()}
            </Typography>
          </Animated.View>
          
          {subtitle && (
            <Animated.View style={subtitleAnimatedStyle}>
              <Typography
                variant="subtitle"
                weight="medium"
                color="inverse"
                style={styles.subtitle}
              >
                {subtitle}
              </Typography>
            </Animated.View>
          )}
        </Box>
        
        {children}
      </Box>
    </Box>
  );
};

const createStyles = (theme: Theme, contentPadding: number) => StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    paddingHorizontal: contentPadding,
    paddingBottom: theme.spacing.xs,
    paddingTop: theme.spacing.sm, // Increased top padding for better spacing
    zIndex: 10,
    height: '100%',
    justifyContent: 'flex-start',
  },
  geometryContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  geometryLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  floatingCircle: {
    position: 'absolute',
    borderRadius: theme.borderRadius.full,
  },
  circle1: {
    width: 120,
    height: 120,
    top: '15%',
    right: '10%',
  },
  circle2: {
    width: 80,
    height: 80,
    top: '60%',
    left: '5%',
  },
  circle3: {
    width: 60,
    height: 60,
    top: '45%',
    right: '25%',
  },
  timeContainer: {
    position: 'absolute',
    alignItems: 'flex-end',
    zIndex: 15,
  },
  dateContainer: {
    alignItems: 'flex-start',
    zIndex: 15,
  },
  timeText: {
    letterSpacing: -0.5,
    textShadowColor: theme.colors.shadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  dateText: {
    letterSpacing: 0.3,
    opacity: 0.9,
    textShadowColor: theme.colors.shadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  mainContent: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    zIndex: 15,
    minHeight: 45,
    paddingTop: theme.spacing.xs, // Increased top padding for main content area
  },
  title: {
    letterSpacing: -1,
    lineHeight: 32,
    fontSize: 32,
    textShadowColor: theme.colors.shadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    letterSpacing: 0.5,
    lineHeight: 20,
    opacity: 0.95,
    textShadowColor: theme.colors.shadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginTop: -2,
  },
});