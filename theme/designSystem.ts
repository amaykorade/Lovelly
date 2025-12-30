/**
 * Design System for Lovelly - Couples App
 * 
 * Design Philosophy: Intimacy, Playfulness, Connection, Softness
 * UI should feel "organic" and "fluid" with rounded corners and soft shadows
 * Transitions should be spring-based and bouncy
 * Always reference this file for colors, typography, spacing, and component styles.
 */

// ============================================================================
// COLOR PALETTE - "Eternal Warmth" (Light Theme - Recommended)
// ============================================================================

export const colors = {
  // Primary Colors - "Romantic Love" Theme - Warm, visible, loving
  primary: {
    rose: '#E91E63',           // Deep Rose Pink - Primary actions, hearts, CTAs (highly visible)
    softRose: '#F8BBD0',       // Soft Rose - Backgrounds, subtle accents
    coral: '#FF6B9D',          // Coral Pink - Hover states, active elements
    accent: '#C2185B',         // Deep Pink - Important actions
  },

  // Background & Surface - Warm, romantic, visible
  background: {
    main: '#FFF5F8',           // Very Light Warm Pink - Main background (warmer than white)
    surface: '#FFFFFF',        // Pure White - Cards and modals (for contrast)
    card: '#FFFBFD',           // Slightly tinted white for cards
  },

  // Text Colors - High contrast for visibility
  text: {
    primary: '#1A1A1A',        // Almost Black - Primary text (high contrast)
    secondary: '#4A4A4A',       // Dark Gray - Secondary text (visible)
    tertiary: '#6B6B6B',       // Medium Gray - Tertiary text
    inverse: '#FFFFFF',        // White text for dark backgrounds
  },

  // Legacy colors (for backward compatibility)
  softRose: '#E91E63',         // Alias for primary.rose
  deepRose: '#C2185B',         // Alias for primary.accent
  dustyPink: '#F8BBD0',        // Alias for primary.softRose
  warmWhite: '#FFF5F8',        // Alias for background.main
  coral: '#FF6B9D',            // Alias for primary.coral

  // Secondary Colors (Supporting)
  secondary: {
    charcoalGray: '#1A1A1A',   // Text, dark elements (darker for visibility)
    slateGrey: '#4A4A4A',      // Secondary text (more visible)
    lightGray: '#E0E0E0',       // Borders, dividers (softer)
    successGreen: '#4CAF50',    // Online status, confirmations
    accentGold: '#FFB300',     // Special moments, achievements (warmer gold)
  },

  // Dark Mode - "Midnight Bond" Theme
  dark: {
    primary: '#FD79A8',        // Neon Pink
    secondary: '#A29BFE',      // Periwinkle
    background: '#1E1E2E',     // Deep Navy/Graphite
    surface: '#2D2D44',         // Lighter Navy
    text: '#DFE6E9',            // Off-white
    border: '#444444',          // Borders
  },

  // Message Bubbles - Romantic, visible
  messages: {
    yours: '#E91E63',          // Your message bubble (Deep Rose Pink)
    partner: '#F8BBD0',        // Partner message bubble (Soft Rose)
    text: {
      yours: '#FFFFFF',        // Your message text (white - high contrast)
      partner: '#1A1A1A',      // Partner message text (dark - high contrast)
    },
  },

  // Status & Indicators
  status: {
    online: '#4CAF50',         // Online status dot
    offline: '#9E9E9E',        // Offline/away (more visible)
    typing: '#9E9E9E',         // Typing indicator
    read: '#E91E63',           // Read receipt (rose)
    sent: '#B0B0B0',           // Sent receipt (lighter gray)
  },

  // Input Fields - Visible and warm
  input: {
    background: '#FFFFFF',     // White background for clarity
    border: '#E0E0E0',         // Light Gray border
    borderFocus: '#E91E63',    // Rose Pink when focused
    placeholder: '#9E9E9E',    // Medium gray placeholder (visible)
    text: '#1A1A1A',           // Dark text (high contrast)
  },

  // Shadows - Soft and romantic
  shadows: {
    button: '0 4px 12px rgba(233, 30, 99, 0.35)',      // Rose shadow
    buttonHover: '0 6px 16px rgba(233, 30, 99, 0.45)', // Deeper rose shadow
    card: '0 2px 8px rgba(0, 0, 0, 0.08)',
    cardHover: '0 4px 16px rgba(0, 0, 0, 0.12)',
    fab: '0 6px 16px rgba(233, 30, 99, 0.4)',          // Rose FAB shadow
    soft: '0 2px 12px rgba(0, 0, 0, 0.06)',           // Softer shadow
  },
} as const;

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  // Font Families - Rounded Sans-serif (Nunito, Poppins, or Outfit)
  fonts: {
    primary: 'Poppins',           // Rounded, friendly, approachable (fallback to System if not loaded)
    secondary: 'Poppins',         // Same family for consistency
    accent: 'Poppins',            // Consistent rounded feel
  },

  // Font Sizes - Matching design spec
  sizes: {
    h1: 28,          // Page Titles (H1) - Bold, Rounded
    h2: 22,          // Section Headers (H2) - SemiBold
    h3: 18,          // Card Titles
    body: 16,        // Body Text - Medium weight for readability
    small: 13,       // Small Text
    caption: 12,     // Caption - Regular weight
    tiny: 11,        // Timestamps, labels
    couple: 20,      // Couple names, special moments
  },

  // Font Weights
  weights: {
    regular: '400',   // Regular - Captions
    medium: '500',    // Medium - Body text for readability
    semibold: '600',  // SemiBold - Section headers (H2)
    bold: '700',      // Bold - Main headings (H1), CTAs
  },

  // Line Heights - Matching design spec
  lineHeights: {
    h1: 34,          // H1: 28px with 34px line height
    h2: 28,          // H2: 22px with 28px line height
    body: 24,        // Body: 16px with 24px line height
    caption: 16,     // Caption: 12px with 16px line height
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
  },
} as const;

// ============================================================================
// SPACING SYSTEM
// ============================================================================

export const spacing = {
  tiny: 4,      // Tiny gaps (icon spacing)
  xs: 8,        // Extra small
  sm: 12,       // Small (internal padding)
  md: 16,       // Standard (component padding)
  lg: 24,       // Medium (section spacing)
  xl: 32,       // Large (page sections)
  xxl: 48,      // Extra large
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const borderRadius = {
  sm: 12,       // Small elements - More rounded
  md: 16,       // Buttons, inputs - More rounded
  lg: 20,       // Cards, panels - 20px+ for organic feel
  xl: 24,       // Message bubbles - Highly rounded
  xxl: 28,      // Extra large rounded elements
  full: 9999,   // Circular (avatars, FABs)
} as const;

// ============================================================================
// COMPONENT STYLES
// ============================================================================

export const components = {
  // Buttons - Professional, polished, and consistent
  button: {
    primary: {
      background: colors.primary.rose,     // Deep Rose Pink
      text: '#FFFFFF',                      // White text (high contrast)
      paddingVertical: spacing.md,          // 16px vertical padding
      paddingHorizontal: spacing.xl,       // 32px horizontal padding
      minHeight: 48,                        // Minimum height for touch targets
      borderRadius: borderRadius.md,        // 12px - professional rounded corners
      shadow: colors.shadows.button,
      letterSpacing: 0.3,                   // Slight letter spacing for elegance
      hover: {
        background: colors.primary.accent,  // Deeper pink
        shadow: colors.shadows.buttonHover,
      },
      active: {
        background: '#AD1457',            // Darker rose
      },
    },
    secondary: {
      background: colors.background.surface, // White background
      text: colors.primary.rose,             // Rose text
      borderWidth: 2,
      borderColor: colors.primary.rose,      // Rose border
      paddingVertical: spacing.md,           // 16px vertical padding
      paddingHorizontal: spacing.xl,        // 32px horizontal padding
      minHeight: 48,                         // Minimum height for touch targets
      borderRadius: borderRadius.md,         // 12px - professional rounded corners
      letterSpacing: 0.3,                    // Slight letter spacing
      hover: {
        background: colors.primary.softRose,  // Light rose on hover
        borderColor: colors.primary.accent,
      },
    },
    floating: {
      size: 56,
      background: colors.primary.rose,     // Deep Rose Pink
      borderRadius: borderRadius.full,
      shadow: colors.shadows.fab,
    },
  },

  // Cards - Soft, rounded, romantic
  card: {
    background: colors.background.card,     // Slightly tinted white
    border: `1px solid ${colors.secondary.lightGray}`,
    borderRadius: borderRadius.lg,         // 20px for organic feel
    padding: spacing.md,
    shadow: colors.shadows.soft,           // Softer shadow
    hover: {
      shadow: colors.shadows.cardHover,
    },
  },

  // Input Fields
  input: {
    background: colors.input.background,
    border: `2px solid ${colors.input.border}`,
    borderFocus: `2px solid ${colors.input.borderFocus}`,
    borderRadius: borderRadius.md,
    padding: `${spacing.sm}px ${spacing.sm}px`,
    fontSize: typography.sizes.body,
    placeholder: colors.input.placeholder,
  },

  // Message Bubbles - Highly rounded, romantic
  messageBubble: {
    yours: {
      background: colors.messages.yours,     // Deep Rose Pink
      text: colors.messages.text.yours,      // White text (high contrast)
      borderRadius: borderRadius.xxl,        // 28px for highly rounded
      padding: `${spacing.md}px ${spacing.lg}px`,
      maxWidth: '70%',
    },
    partner: {
      background: colors.messages.partner,   // Soft Rose
      text: colors.messages.text.partner,    // Dark text (high contrast)
      borderRadius: borderRadius.xxl,       // 28px for highly rounded
      padding: `${spacing.md}px ${spacing.lg}px`,
      maxWidth: '70%',
    },
  },

  // Status Indicators
  status: {
    online: {
      color: colors.secondary.successGreen,
      size: 12,
    },
    avatar: {
      size: {
        sm: 40,
        md: 56,
        lg: 72,
      },
      border: `2px solid ${colors.primary.rose}`,  // Deep Rose Pink ring
      borderRadius: borderRadius.full,
      pulsing: true,  // Breathing/pulsing ring for partner's avatar
    },
  },
} as const;

// ============================================================================
// LAYOUT
// ============================================================================

export const layout = {
  safeArea: {
    top: spacing.md,
    bottom: spacing.md,
    sides: spacing.md,
  },
  maxWidth: {
    content: 1200,
    message: '70%',
  },
} as const;

// ============================================================================
// ANIMATIONS - Spring-based and bouncy
// ============================================================================

export const animations = {
  duration: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
  easing: {
    default: 'ease',
    smooth: 'ease-in-out',
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',  // Bouncy spring
    bouncy: 'cubic-bezier(0.34, 1.56, 0.64, 1)',       // Bouncy feel
  },
  scale: {
    hover: 1.02,
    active: 0.98,
    bounce: 1.05,  // For playful interactions
  },
  // Spring animations for organic feel
  spring: {
    damping: 15,
    stiffness: 300,
    mass: 1,
  },
} as const;

// ============================================================================
// ICONS
// ============================================================================

export const icons = {
  size: {
    sm: 16,
    md: 20,
    lg: 24,
  },
  color: {
    primary: colors.primary.rose,
    secondary: colors.secondary.charcoalGray,
  },
  strokeWidth: 2,
} as const;

// ============================================================================
// DARK MODE COLORS
// ============================================================================

export const darkMode = {
  background: colors.dark.background,
  surface: colors.dark.surface,
  text: colors.dark.text,
  border: colors.dark.border,
  card: {
    background: colors.dark.surface,
    border: colors.dark.border,
  },
} as const;

// ============================================================================
// EXPORT ALL
// ============================================================================

export const designSystem = {
  colors,
  typography,
  spacing,
  borderRadius,
  components,
  layout,
  animations,
  icons,
  darkMode,
} as const;

export default designSystem;

