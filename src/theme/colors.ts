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
  },

  // Glass morphism colors (for dark theme)
  glass: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: 'rgba(255, 255, 255, 0.1)',
    shadow: 'rgba(0, 0, 0, 0.3)',
  },

  // Neumorphism colors (for light theme) 
  neumorph: {
    light: '#FFFFFF',
    dark: '#D1D9E6',
    background: '#E0E5EC',
    shadow1: 'rgba(163, 177, 198, 0.6)',
    shadow2: 'rgba(255, 255, 255, 0.5)',
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
  },
  secondary: colors.gray[600],
  disabled: colors.gray[400],
  brand: colors.primary[500],
  border: colors.gray[200],
  shadow: 'rgba(0, 0, 0, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.5)',
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
  },
  secondary: colors.gray[400],
  disabled: colors.gray[500],
  brand: colors.primary[400],
  border: colors.gray[800],
  shadow: 'rgba(0, 0, 0, 0.5)',
  overlay: 'rgba(0, 0, 0, 0.7)',
} as const;