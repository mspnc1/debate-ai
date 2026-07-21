import { useMemo } from 'react';
import { ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { useResponsive } from './useResponsive';

/**
 * Responsive container style for the global sheets: centered floating card
 * on tablets, slide-up sheet on phones.
 */
export function useSheetContainerStyle(): ViewStyle {
  const { theme } = useTheme();
  const { isTablet, responsive } = useResponsive();

  return useMemo((): ViewStyle => {
    if (isTablet) {
      return {
        position: 'absolute',
        top: '10%',
        bottom: '10%',
        left: '15%',
        right: '15%',
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.xl,
        zIndex: 1001,
        overflow: 'hidden',
        // Shadow for floating effect
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 10,
      };
    }
    // Phone: slide up from bottom
    return {
      position: 'absolute',
      top: responsive(100, 80),
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      zIndex: 1001,
    };
  }, [isTablet, responsive, theme]);
}
