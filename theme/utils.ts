/**
 * Design System Utilities
 * 
 * Helper functions to easily use the design system in components
 */

import { colors, spacing, typography, borderRadius, components } from './designSystem';
import { wp, hp, fontSize as responsiveFontSize } from '../lib/responsive';

/**
 * Get color value from design system
 */
export const getColor = (path: string): string => {
  const keys = path.split('.');
  let value: any = colors;
  for (const key of keys) {
    value = value[key];
    if (!value) return '#000000'; // Fallback
  }
  return value;
};

/**
 * Get spacing value (responsive)
 */
export const getSpacing = (size: keyof typeof spacing): number => {
  return wp(spacing[size]);
};

/**
 * Get typography size (responsive, respects device font scaling)
 */
export const getFontSize = (size: keyof typeof typography.sizes): number => {
  return responsiveFontSize(typography.sizes[size]);
};

/**
 * Get border radius
 */
export const getBorderRadius = (size: keyof typeof borderRadius): number => {
  return borderRadius[size];
};

/**
 * Create style object for primary button (responsive)
 */
export const primaryButtonStyle = {
  backgroundColor: components.button.primary.background,
  paddingVertical: wp(spacing.sm),
  paddingHorizontal: wp(spacing.lg),
  borderRadius: wp(borderRadius.md),
  shadowColor: colors.primary.softRose,
  shadowOffset: { width: 0, height: wp(4) },
  shadowOpacity: 0.3,
  shadowRadius: wp(12),
  elevation: 4,
};

/**
 * Create style object for secondary button (responsive)
 */
export const secondaryButtonStyle = {
  backgroundColor: components.button.secondary.background,
  paddingVertical: wp(spacing.md),
  paddingHorizontal: wp(spacing.lg),
  borderRadius: wp(borderRadius.md),
};

/**
 * Create style object for input field (responsive)
 */
export const inputStyle = {
  backgroundColor: components.input.background,
  borderWidth: 2,
  borderColor: components.input.border,
  borderRadius: wp(borderRadius.md),
  paddingVertical: wp(spacing.sm),
  paddingHorizontal: wp(spacing.sm),
  fontSize: responsiveFontSize(typography.sizes.body),
  color: colors.input.text,
};

/**
 * Create style object for card (responsive)
 */
export const cardStyle = {
  backgroundColor: components.card.background,
  borderWidth: 1,
  borderColor: components.card.border,
  borderRadius: wp(borderRadius.lg),
  padding: wp(spacing.md),
  shadowColor: '#000',
  shadowOffset: { width: 0, height: wp(2) },
  shadowOpacity: 0.08,
  shadowRadius: wp(8),
  elevation: 2,
};

/**
 * Create style object for message bubble (yours)
 */
export const yourMessageStyle = {
  backgroundColor: components.messageBubble.yours.background,
  borderRadius: borderRadius.xl,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.sm,
  maxWidth: '70%',
};

/**
 * Create style object for message bubble (partner)
 */
export const partnerMessageStyle = {
  backgroundColor: components.messageBubble.partner.background,
  borderRadius: borderRadius.xl,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.sm,
  maxWidth: '70%',
};

/**
 * Get responsive font size (use this instead of typography.sizes directly)
 */
export const getResponsiveFontSize = (size: keyof typeof typography.sizes): number => {
  return responsiveFontSize(typography.sizes[size]);
};

/**
 * Text style helpers (responsive)
 */
export const textStyles = {
  h1: {
    fontFamily: typography.fonts.primary,
    fontSize: responsiveFontSize(typography.sizes.h1),
    fontWeight: typography.weights.bold,
    color: colors.secondary.charcoalGray,
  },
  h2: {
    fontFamily: typography.fonts.primary,
    fontSize: responsiveFontSize(typography.sizes.h2),
    fontWeight: typography.weights.semibold,
    color: colors.secondary.charcoalGray,
  },
  h3: {
    fontFamily: typography.fonts.primary,
    fontSize: responsiveFontSize(typography.sizes.h3),
    fontWeight: typography.weights.medium,
    color: colors.secondary.charcoalGray,
  },
  body: {
    fontFamily: typography.fonts.secondary,
    fontSize: responsiveFontSize(typography.sizes.body),
    fontWeight: typography.weights.regular,
    color: colors.secondary.charcoalGray,
  },
  small: {
    fontFamily: typography.fonts.secondary,
    fontSize: responsiveFontSize(typography.sizes.small),
    fontWeight: typography.weights.regular,
    color: colors.secondary.charcoalGray,
  },
  couple: {
    fontFamily: typography.fonts.accent,
    fontSize: responsiveFontSize(typography.sizes.couple),
    fontWeight: typography.weights.regular,
    color: colors.secondary.charcoalGray,
  },
};

export default {
  getColor,
  getSpacing,
  getFontSize,
  getResponsiveFontSize,
  getBorderRadius,
  primaryButtonStyle,
  secondaryButtonStyle,
  inputStyle,
  cardStyle,
  yourMessageStyle,
  partnerMessageStyle,
  textStyles,
};

