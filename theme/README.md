# Lovelly Design System

This directory contains the complete design system for the Lovelly couples app. Always reference these files when building or styling components.

## Quick Start

```typescript
// Import the design system
import { colors, spacing, typography, borderRadius } from '../theme';
import { primaryButtonStyle, textStyles } from '../theme/utils';

// Use in your component
<View style={{ padding: spacing.md, backgroundColor: colors.primary.warmWhite }}>
  <Text style={textStyles.h1}>Welcome</Text>
  <Button style={primaryButtonStyle}>Click Me</Button>
</View>
```

## File Structure

- `designSystem.ts` - Complete design tokens (colors, typography, spacing, etc.)
- `utils.ts` - Helper functions and pre-built style objects
- `index.ts` - Main export file

## Usage Examples

### Colors

```typescript
import { colors } from '../theme';

// Primary colors
colors.primary.softRose      // #E8849A - Main CTA color
colors.primary.deepRose      // #D1456F - Hover states
colors.primary.dustyPink     // #F5D5DD - Backgrounds
colors.primary.warmWhite     // #FFFBF7 - Main background

// Secondary colors
colors.secondary.charcoalGray // #2C2C2C - Text
colors.secondary.lightGray    // #E8E8E8 - Borders
colors.status.online          // #4CAF50 - Online status
```

### Spacing

```typescript
import { spacing } from '../theme';

// Use consistent spacing
padding: spacing.tiny  // 4px
padding: spacing.xs    // 8px
padding: spacing.sm    // 12px
padding: spacing.md    // 16px (standard)
padding: spacing.lg    // 24px
padding: spacing.xl    // 32px
```

### Typography

```typescript
import { typography, textStyles } from '../theme';

// Pre-built text styles
<Text style={textStyles.h1}>Page Title</Text>
<Text style={textStyles.h2}>Section Header</Text>
<Text style={textStyles.body}>Body text</Text>
<Text style={textStyles.couple}>Partner Name</Text>

// Or use directly
fontSize: typography.sizes.h1
fontFamily: typography.fonts.primary
fontWeight: typography.weights.bold
```

### Components

```typescript
import { primaryButtonStyle, inputStyle, cardStyle } from '../theme/utils';

// Pre-built component styles
<Button style={primaryButtonStyle}>Primary Button</Button>
<TextInput style={inputStyle} />
<View style={cardStyle}>Card Content</View>
```

### Tailwind Classes

The design system colors are also available as Tailwind classes:

```tsx
// Use Tailwind classes with design system colors
<View className="bg-rose-soft p-4 rounded-lg">
  <Text className="text-gray-charcoal text-body">
    Content
  </Text>
</View>
```

Available Tailwind colors:
- `bg-rose-soft`, `bg-rose-deep`, `bg-rose-dusty`
- `bg-white-warm`
- `text-gray-charcoal`, `text-gray-light`
- `bg-success`, `bg-gold`

## Design Principles

1. **Soft Modern Romance** - Rounded corners, subtle shadows, generous spacing
2. **Consistency** - Always use design system values, never hardcode
3. **Accessibility** - Colors meet WCAG AA contrast requirements
4. **Responsive** - Works on all screen sizes

## Color Usage Guidelines

- **Soft Rose (#E8849A)**: Primary CTAs, buttons, highlights
- **Deep Rose (#D1456F)**: Hover states, active states
- **Dusty Pink (#F5D5DD)**: Backgrounds, light accents, partner messages
- **Warm White (#FFFBF7)**: Main background
- **Charcoal Gray (#2C2C2C)**: Primary text color
- **Light Gray (#E8E8E8)**: Borders, dividers

## Typography Guidelines

- **Poppins**: Primary font for headings and UI elements
- **Inter**: Body text and smaller content
- **Playfair Display**: Couple names, anniversaries, special moments

## Spacing Guidelines

Always use the spacing scale (4, 8, 12, 16, 24, 32px) for consistency.

## Component Guidelines

- Buttons: 12px border radius, Soft Rose background
- Cards: 16px border radius, subtle shadow
- Inputs: 12px border radius, 2px border, Soft Rose on focus
- Message bubbles: 18px border radius, 70% max width

## Need Help?

Refer to `designSystem.ts` for all available values and `utils.ts` for helper functions.

