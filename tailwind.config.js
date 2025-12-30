/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Design System Colors
        rose: {
          soft: '#E8849A',    // Primary CTA color
          deep: '#D1456F',    // Hover/Active states
          dusty: '#F5D5DD',   // Backgrounds, accents
        },
        white: {
          warm: '#FFFBF7',    // Main background
          DEFAULT: '#FFFFFF',
        },
        gray: {
          charcoal: '#2C2C2C',  // Text, dark elements
          light: '#E8E8E8',      // Borders, dividers
          placeholder: '#BFBFBF', // Placeholder text
          timestamp: '#999999',   // Timestamps
        },
        success: '#4CAF50',      // Online status, confirmations
        gold: '#FFD700',         // Special moments, achievements
        // Keep primary for backward compatibility
        primary: {
          DEFAULT: '#E8849A',   // Soft Rose
          deep: '#D1456F',      // Deep Rose
          dusty: '#F5D5DD',     // Dusty Pink
        },
      },
      fontSize: {
        // Consistent font sizes
        'xs': '12px',
        'sm': '14px',
        'base': '16px',
        'lg': '18px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '30px',
        '4xl': '36px',
      },
      spacing: {
        // Consistent spacing scale
        '0.5': '2px',
        '1': '4px',
        '1.5': '6px',
        '2': '8px',
        '2.5': '10px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
      },
    },
  },
  plugins: [],
}