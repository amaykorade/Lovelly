import { Dimensions, Platform, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone X/11 standard - middle of common phone sizes)
// This ensures most phones (375-414px width) get minimal or no scaling
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Responsive width - scales based on screen width
 * @param size - Base size in pixels
 * @returns Scaled size
 */
export const wp = (size: number): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  // Scale proportionally but cap at reasonable limits
  const scaled = size * scale;
  // Round to avoid sub-pixel rendering issues
  return Math.round(scaled);
};

/**
 * Responsive height - scales based on screen height
 * @param size - Base size in pixels
 * @returns Scaled size
 */
export const hp = (size: number): number => {
  const scale = SCREEN_HEIGHT / BASE_HEIGHT;
  // Scale proportionally but cap at reasonable limits
  const scaled = size * scale;
  // Round to avoid sub-pixel rendering issues
  return Math.round(scaled);
};

/**
 * Font size - scales based on screen width for consistency
 * @param size - Base font size
 * @returns Scaled font size
 */
export const fontSize = (size: number): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  // Scale font size proportionally but use PixelRatio for crisp rendering
  const scaled = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

/**
 * Get responsive spacing
 * @param size - Base spacing size
 * @returns Scaled spacing
 */
export const spacing = (size: number): number => {
  return wp(size);
};

/**
 * Check if device is small screen
 */
export const isSmallScreen = (): boolean => {
  return SCREEN_WIDTH < 375;
};

/**
 * Check if device is large screen
 */
export const isLargeScreen = (): boolean => {
  return SCREEN_WIDTH > 414;
};

/**
 * Get screen dimensions
 */
export const getScreenDimensions = () => ({
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  isSmall: isSmallScreen(),
  isLarge: isLargeScreen(),
});

/**
 * Platform-specific adjustments
 */
export const platform = {
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
  paddingTop: Platform.OS === 'ios' ? 44 : 24,
  paddingBottom: Platform.OS === 'ios' ? 34 : 16,
};

