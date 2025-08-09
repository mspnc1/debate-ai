import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, G, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

interface AppLogoProps {
  size?: number;
}

const AppLogo: React.FC<AppLogoProps> = ({ size = 120 }) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Defs>
          {/* Premium gradient background */}
          <LinearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#0F0F0F" />
            <Stop offset="100%" stopColor="#1A1A1A" />
          </LinearGradient>
          
          {/* Sophisticated color gradients */}
          <LinearGradient id="accent1" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FF3CAC" />
            <Stop offset="100%" stopColor="#784BA0" />
          </LinearGradient>
          
          <LinearGradient id="accent2" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#2B86C5" />
            <Stop offset="100%" stopColor="#784BA0" />
          </LinearGradient>
          
          <LinearGradient id="accent3" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#00D9FF" />
            <Stop offset="100%" stopColor="#FF3CAC" />
          </LinearGradient>
          
          <LinearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.3" />
            <Stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.1" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        
        {/* Background */}
        <Rect
          x="0"
          y="0"
          width="120"
          height="120"
          rx="26"
          ry="26"
          fill="url(#bgGradient)"
        />
        
        {/* Abstract interconnected shape - represents AI convergence */}
        <G transform="translate(60, 60)">
          {/* Core element - three interlocking arcs */}
          {/* Arc 1 */}
          <Path
            d="M 0 -25 Q -25 -10, -25 10 Q -25 30, 0 25"
            fill="none"
            stroke="url(#accent1)"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.9"
          />
          
          {/* Arc 2 */}
          <Path
            d="M 0 -25 Q 25 -10, 25 10 Q 25 30, 0 25"
            fill="none"
            stroke="url(#accent2)"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.9"
          />
          
          {/* Arc 3 - horizontal connector */}
          <Path
            d="M -25 0 Q 0 -15, 25 0 Q 0 15, -25 0"
            fill="none"
            stroke="url(#accent3)"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.9"
          />
          
          {/* Central convergence point */}
          <Circle cx="0" cy="0" r="6" fill="url(#glow)" />
          <Circle cx="0" cy="0" r="3" fill="#FFFFFF" opacity="0.9" />
          
          {/* Orbital dots representing data flow */}
          <Circle cx="0" cy="-25" r="2" fill="#FFFFFF" opacity="0.7" />
          <Circle cx="0" cy="25" r="2" fill="#FFFFFF" opacity="0.7" />
          <Circle cx="-25" cy="0" r="2" fill="#FFFFFF" opacity="0.5" />
          <Circle cx="25" cy="0" r="2" fill="#FFFFFF" opacity="0.5" />
        </G>
        
        {/* Subtle geometric accents */}
        <G transform="translate(60, 60)">
          {/* Top accent line */}
          <Path
            d="M -15 -35 L 15 -35"
            stroke="#FFFFFF"
            strokeWidth="0.5"
            opacity="0.3"
          />
          {/* Bottom accent line */}
          <Path
            d="M -15 35 L 15 35"
            stroke="#FFFFFF"
            strokeWidth="0.5"
            opacity="0.3"
          />
          {/* Left accent */}
          <Path
            d="M -35 -15 L -35 15"
            stroke="#FFFFFF"
            strokeWidth="0.5"
            opacity="0.3"
          />
          {/* Right accent */}
          <Path
            d="M 35 -15 L 35 15"
            stroke="#FFFFFF"
            strokeWidth="0.5"
            opacity="0.3"
          />
        </G>
        
        {/* Premium corner dots */}
        <Circle cx="26" cy="26" r="1" fill="#FFFFFF" opacity="0.2" />
        <Circle cx="94" cy="26" r="1" fill="#FFFFFF" opacity="0.2" />
        <Circle cx="26" cy="94" r="1" fill="#FFFFFF" opacity="0.2" />
        <Circle cx="94" cy="94" r="1" fill="#FFFFFF" opacity="0.2" />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AppLogo;