import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, Stop, Rect, LinearGradient, G } from 'react-native-svg';

interface AppIconGeneratorProps {
  size?: number;
}

const AppIconGenerator: React.FC<AppIconGeneratorProps> = ({ 
  size = 1024
}) => {
  // AI provider colors
  const aiColors = [
    '#C15F3C', // Claude
    '#10A37F', // ChatGPT
    '#4888F8', // Gemini
    '#20808D', // Perplexity
    '#FA520F', // Mistral
    '#FF7759', // Cohere
    '#0F6FFF', // Together
    '#4D6BFE', // DeepSeek
    '#1DA1F2', // Grok
  ];

  const centerX = size * 0.5;
  const centerY = size * 0.5;
  const circleRadius = size * 0.16;
  const orbitRadius = size * 0.17;
  
  const circles = [];
  for (let i = 0; i < 9; i++) {
    const angle = (i * 40) * Math.PI / 180;
    const x = centerX + Math.cos(angle) * orbitRadius;
    const y = centerY + Math.sin(angle) * orbitRadius;
    
    circles.push({ x, y, color: aiColors[i] });
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          {/* Background gradient */}
          <LinearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#1A1A1A" />
            <Stop offset="100%" stopColor="#1A1A1A" />
          </LinearGradient>
        </Defs>
        
        {/* Dark background */}
        <Rect 
          x="0" 
          y="0" 
          width={size} 
          height={size} 
          fill="#1A1A1A"
          rx={size * 0.08}
          ry={size * 0.08}
        />
        
        {/* Overlapping circles with subtle glow */}
        {circles.map((circle, index) => (
          <G key={index}>
            {/* Very subtle outer glow */}
            <Circle
              cx={circle.x}
              cy={circle.y}
              r={circleRadius * 1.05}
              fill={circle.color}
              opacity={0.15}
            />
            {/* Main circle - vibrant */}
            <Circle
              cx={circle.x}
              cy={circle.y}
              r={circleRadius}
              fill={circle.color}
              opacity={0.65}
            />
          </G>
        ))}
        
        {/* Dark center circle */}
        <Circle
          cx={centerX}
          cy={centerY}
          r={size * 0.06}
          fill="#1A1A1A"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A1A',
  },
});

export { AppIconGenerator };