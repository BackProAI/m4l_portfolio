// ============================================================================
// Theme Configuration - mlfs.com.au Color Scheme & Design System
// ============================================================================

/**
 * Color palette extracted from mlfs.com.au
 * Professional financial advisory aesthetic
 */

export const colors = {
  // Primary Colors
  primary: {
    DEFAULT: '#1B4F7B', // Deep professional blue
    50: '#EBF2F8',
    100: '#D7E5F0',
    200: '#AFCBE1',
    300: '#87B1D2',
    400: '#5F97C3',
    500: '#1B4F7B', // Main
    600: '#164169',
    700: '#103157',
    800: '#0B2145',
    900: '#051033',
  },
  
  // Secondary Colors
  secondary: {
    DEFAULT: '#3B7FA7', // Lighter blue for accents
    50: '#EFF6FA',
    100: '#DFEDF5',
    200: '#BFDBEB',
    300: '#9FC9E1',
    400: '#7FB7D7',
    500: '#3B7FA7', // Main
    600: '#2F6686',
    700: '#234C64',
    800: '#183343',
    900: '#0C1921',
  },
  
  // Accent Colors
  accent: {
    DEFAULT: '#E67E22', // Gold/orange for CTAs
    50: '#FDF4EC',
    100: '#FBE9D9',
    200: '#F7D3B3',
    300: '#F3BD8D',
    400: '#EFA767',
    500: '#E67E22', // Main
    600: '#B8651B',
    700: '#8A4C14',
    800: '#5C320E',
    900: '#2E1907',
  },
  
  // Neutral Colors
  neutral: {
    DEFAULT: '#2C3E50', // Dark gray for body text
    50: '#F8F9FA',
    100: '#EEF0F2',
    200: '#DDE1E5',
    300: '#CCD2D8',
    400: '#BBC3CB',
    500: '#6C757D', // Secondary text
    600: '#4A5662',
    700: '#3A4651',
    800: '#2C3E50', // Main body text
    900: '#1E2A38',
  },
  
  // Status Colors
  success: {
    DEFAULT: '#2ECC71',
    50: '#EDFBF3',
    100: '#DBF7E7',
    200: '#B7EFCF',
    300: '#93E7B7',
    400: '#6FDA9F',
    500: '#2ECC71', // Main
    600: '#25A35A',
    700: '#1C7A44',
    800: '#13522D',
    900: '#0A2917',
  },
  
  error: {
    DEFAULT: '#E74C3C',
    50: '#FDECEB',
    100: '#FBD9D7',
    200: '#F7B3AF',
    300: '#F38D87',
    400: '#EF675F',
    500: '#E74C3C', // Main
    600: '#B93D30',
    700: '#8B2E24',
    800: '#5C1F18',
    900: '#2E0F0C',
  },
  
  warning: {
    DEFAULT: '#F39C12',
    50: '#FEF7EC',
    100: '#FDEFD9',
    200: '#FBDFB3',
    300: '#F9CF8D',
    400: '#F7BF67',
    500: '#F39C12', // Main
    600: '#C27D0E',
    700: '#925E0B',
    800: '#613F07',
    900: '#311F04',
  },
  
  info: {
    DEFAULT: '#3498DB',
    50: '#EBF5FB',
    100: '#D7EBF7',
    200: '#AFD7EF',
    300: '#87C3E7',
    400: '#5FAFDF',
    500: '#3498DB', // Main
    600: '#2A7AAF',
    700: '#1F5B83',
    800: '#153D58',
    900: '#0A1E2C',
  },
  
  // Border Colors
  border: {
    light: '#E0E0E0',
    DEFAULT: '#CBD5E0',
    dark: '#A0AEC0',
  },
  
  // Background Colors
  background: {
    DEFAULT: '#FFFFFF',
    secondary: '#F8F9FA',
    tertiary: '#F1F3F5',
    dark: '#1E2A38',
  },
} as const;

/**
 * Typography scale
 */
export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
    serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
    mono: ['Menlo', 'Monaco', 'Courier New', 'monospace'],
  },
  
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
  },
  
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

/**
 * Spacing scale (based on 4px unit)
 */
export const spacing = {
  0: '0',
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  5: '1.25rem',  // 20px
  6: '1.5rem',   // 24px
  8: '2rem',     // 32px
  10: '2.5rem',  // 40px
  12: '3rem',    // 48px
  16: '4rem',    // 64px
  20: '5rem',    // 80px
  24: '6rem',    // 96px
} as const;

/**
 * Border radius values
 */
export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
} as const;

/**
 * Box shadow values
 */
export const boxShadow = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  none: 'none',
} as const;

/**
 * Breakpoints for responsive design
 */
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

/**
 * Z-index scale
 */
export const zIndex = {
  hide: -1,
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
} as const;

/**
 * Animation duration values (in milliseconds)
 */
export const duration = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

/**
 * Transition timing functions
 */
export const easing = {
  linear: 'linear',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;
