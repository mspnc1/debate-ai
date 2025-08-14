export const colors = {
  // Primary brand colors
  primary: {
    50: '#E3F2FF',
    100: '#B8DEFF',
    200: '#8CC9FF',
    300: '#60B3FF',
    400: '#3D9FFF',
    500: '#007AFF', // Primary brand color
    600: '#0066D9',
    700: '#0052B3',
    800: '#003E8C',
    900: '#002B66',
  },

  // Grayscale
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },

  // System colors
  success: {
    50: '#E8F5E8',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#4CAF50',
    600: '#388E3C',
    700: '#2E7D32',
    800: '#1B5E20',
    900: '#0D3E10',
  },
  
  warning: {
    50: '#FFF8E1',
    100: '#FFECB3',
    200: '#FFE082',
    300: '#FFD54F',
    400: '#FFCA28',
    500: '#FF9800',
    600: '#F57C00',
    700: '#EF6C00',
    800: '#E65100',
    900: '#BF360C',
  },

  error: {
    50: '#FFEBEE',
    100: '#FFCDD2',
    200: '#EF9A9A',
    300: '#E57373',
    400: '#EF5350',
    500: '#F44336',
    600: '#D32F2F',
    700: '#C62828',
    800: '#B71C1C',
    900: '#7F0000',
  },
  
  info: {
    50: '#E3F2FD',
    100: '#BBDEFB',
    200: '#90CAF9',
    300: '#64B5F6',
    400: '#42A5F5',
    500: '#2196F3',
    600: '#1E88E5',
    700: '#1976D2',
    800: '#1565C0',
    900: '#0D47A1',
  },


  // Gradients for premium components
  gradients: {
    primary: ['#667EEA', '#764BA2'],
    sunrise: ['#F093FB', '#F5576C'],
    ocean: ['#4FACFE', '#00F2FE'],
    forest: ['#38F9D7', '#43E97B'],
    sunset: ['#FA709A', '#FEE140'],
    premium: ['#667EEA', '#764BA2'],
    success: ['#43E97B', '#38F9D7'],  // Green gradient for positive/savings
    danger: ['#F5576C', '#F093FB'],   // Red gradient for warnings
  },

  // Glass morphism colors (for dark theme)
  glass: {
    background: 'rgba(255, 255, 255, 0.05)',
    backgroundLight: 'rgba(255, 255, 255, 0.02)',
    border: 'rgba(255, 255, 255, 0.1)',
    borderLight: 'rgba(255, 255, 255, 0.2)',
    shadow: 'rgba(0, 0, 0, 0.3)',
    shadowLight: 'rgba(0, 0, 0, 0.5)',
  },

  // Neumorphism colors (for light theme) 
  neumorph: {
    light: '#FFFFFF',
    dark: '#D1D9E6',
    background: '#E0E5EC',
    shadow1: 'rgba(163, 177, 198, 0.6)',
    shadow2: 'rgba(255, 255, 255, 0.5)',
  },
  
  // Overlay colors for both themes
  overlays: {
    light: {
      subtle: 'rgba(0, 0, 0, 0.02)',
      soft: 'rgba(0, 0, 0, 0.03)',
      medium: 'rgba(0, 0, 0, 0.05)',
      strong: 'rgba(0, 0, 0, 0.1)',
      backdrop: 'rgba(0, 0, 0, 0.2)',
      backdropDark: 'rgba(0, 0, 0, 0.4)',
    },
    dark: {
      subtle: 'rgba(255, 255, 255, 0.02)',
      soft: 'rgba(255, 255, 255, 0.05)',
      medium: 'rgba(255, 255, 255, 0.1)',
      strong: 'rgba(255, 255, 255, 0.2)',
      backdrop: 'rgba(0, 0, 0, 0.3)',
      backdropDark: 'rgba(0, 0, 0, 0.5)',
    },
  },
  
  // Semantic overlays for special states
  semantic: {
    winner: 'rgba(255, 215, 0, 0.1)',
    winnerBorder: 'rgba(255, 215, 0, 0.3)',
    primary: 'rgba(99, 102, 241, 0.1)',
    secondary: 'rgba(168, 85, 247, 0.1)',
    success: 'rgba(34, 197, 94, 0.1)',
    info: 'rgba(59, 130, 246, 0.1)',
    warning: 'rgba(249, 115, 22, 0.1)',
    error: 'rgba(239, 68, 68, 0.1)',
    gold: 'rgba(234, 179, 8, 0.1)',
  },
  
  // PDF specific colors (always light theme for printing)
  pdf: {
    text: {
      primary: '#1a1a1a',
      secondary: '#6b7280',
      tertiary: '#374151',
    },
    surface: '#f8f9fa',
    border: '#e5e7eb',
    background: '#ffffff',
    gradientStart: '#f5f7fa',
    gradientEnd: '#c3cfe2',
  },
} as const;

// Light theme colors
export const lightThemeColors = {
  background: '#FFFFFF',
  surface: colors.gray[50],
  card: '#FFFFFF',
  text: {
    primary: colors.gray[900],
    secondary: colors.gray[600],
    disabled: colors.gray[400],
    inverse: '#FFFFFF',
    white: '#FFFFFF',
    black: '#000000',
  },
  secondary: colors.gray[600],
  disabled: colors.gray[400],
  brand: colors.primary[500],
  border: colors.gray[200],
  shadow: colors.overlays.light.strong,
  shadowDark: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlays: colors.overlays.light,
  semantic: colors.semantic,
  glass: colors.glass,
  pdf: colors.pdf,
} as const;

// Dark theme colors
export const darkThemeColors = {
  background: '#000000',
  surface: '#0A0A0A',
  card: '#1A1A1A',
  text: {
    primary: '#FFFFFF',
    secondary: colors.gray[400],
    disabled: colors.gray[500],
    inverse: '#FFFFFF',
    white: '#FFFFFF',
    black: '#000000',
  },
  secondary: colors.gray[400],
  disabled: colors.gray[500],
  brand: colors.primary[400],
  border: colors.gray[800],
  shadow: colors.overlays.dark.strong,
  shadowDark: '#000000',
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlays: colors.overlays.dark,
  semantic: colors.semantic,
  glass: colors.glass,
  pdf: colors.pdf,
} as const;