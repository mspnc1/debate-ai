import React from 'react';
import { View, ViewProps } from 'react-native';
import { useTheme } from '../../theme';
import type { SpacingKey } from '../../theme/spacing';

interface ThemedViewProps extends Omit<ViewProps, 'style'> {
  style?: ViewProps['style'];
  backgroundColor?: 'background' | 'surface' | 'card' | 'transparent';
  padding?: SpacingKey;
  margin?: SpacingKey;
  paddingHorizontal?: SpacingKey;
  paddingVertical?: SpacingKey;
  paddingTop?: SpacingKey;
  paddingBottom?: SpacingKey;
  paddingLeft?: SpacingKey;
  paddingRight?: SpacingKey;
  marginHorizontal?: SpacingKey;
  marginVertical?: SpacingKey;
  marginTop?: SpacingKey;
  marginBottom?: SpacingKey;
  marginLeft?: SpacingKey;
  marginRight?: SpacingKey;
  borderRadius?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  flex?: number;
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
}

export const ThemedView: React.FC<ThemedViewProps> = ({
  style,
  backgroundColor = 'transparent',
  padding,
  margin,
  paddingHorizontal,
  paddingVertical,
  paddingTop,
  paddingBottom,
  paddingLeft,
  paddingRight,
  marginHorizontal,
  marginVertical,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  borderRadius,
  flex,
  flexDirection,
  alignItems,
  justifyContent,
  ...props
}) => {
  const { theme } = useTheme();
  
  const themedStyle = {
    backgroundColor: backgroundColor !== 'transparent' ? theme.colors[backgroundColor] : undefined,
    padding: padding ? theme.spacing[padding] : undefined,
    margin: margin ? theme.spacing[margin] : undefined,
    paddingHorizontal: paddingHorizontal ? theme.spacing[paddingHorizontal] : undefined,
    paddingVertical: paddingVertical ? theme.spacing[paddingVertical] : undefined,
    paddingTop: paddingTop ? theme.spacing[paddingTop] : undefined,
    paddingBottom: paddingBottom ? theme.spacing[paddingBottom] : undefined,
    paddingLeft: paddingLeft ? theme.spacing[paddingLeft] : undefined,
    paddingRight: paddingRight ? theme.spacing[paddingRight] : undefined,
    marginHorizontal: marginHorizontal ? theme.spacing[marginHorizontal] : undefined,
    marginVertical: marginVertical ? theme.spacing[marginVertical] : undefined,
    marginTop: marginTop ? theme.spacing[marginTop] : undefined,
    marginBottom: marginBottom ? theme.spacing[marginBottom] : undefined,
    marginLeft: marginLeft ? theme.spacing[marginLeft] : undefined,
    marginRight: marginRight ? theme.spacing[marginRight] : undefined,
    borderRadius: borderRadius ? theme.borderRadius[borderRadius] : undefined,
    flex,
    flexDirection,
    alignItems,
    justifyContent,
  };
  
  return <View style={[themedStyle, style]} {...props} />;
};