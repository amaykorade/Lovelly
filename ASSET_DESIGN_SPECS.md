# Asset Design Specifications

Complete guide for creating app icons, logos, and splash screens for Lovelly.

## 📱 App Icon Requirements

### Main App Icon (`icon.png`)
- **Size**: 1024 x 1024 pixels
- **Format**: PNG
- **Background**: Solid color (no transparency for iOS)
- **Shape**: Square
- **Design Guidelines**:
  - Keep important elements in the center (safe zone: ~80% of the icon)
  - Avoid text that's too small (will be hard to read at small sizes)
  - Use high contrast colors
  - Test at small sizes (appears as 60x60px on iOS, 48x48px on Android)
  - No rounded corners (system adds them automatically)

### Android Adaptive Icon (`adaptive-icon.png`)
- **Size**: 1024 x 1024 pixels
- **Format**: PNG
- **Background Color**: `#020617` (dark blue-black) - defined in app.json
- **Design Guidelines**:
  - **Safe Zone**: Keep important content within the center 66% (about 675x675px)
  - Outer 33% may be cropped on different Android devices
  - Can have transparency (unlike iOS)
  - Design should work when cropped to circle, square, or rounded square
  - Background color shows through transparent areas

### Web Favicon (`favicon.png`)
- **Size**: 48 x 48 pixels (minimum)
- **Recommended**: 512 x 512 pixels (scales better)
- **Format**: PNG or ICO
- **Design**: Simplified version of main icon (details may be lost at small size)

## 🎨 Splash Screen Requirements

### Splash Screen (`splash.png`)
- **Size**: 1284 x 2778 pixels (iPhone 14 Pro Max size - covers all devices)
- **Alternative Sizes** (if you want device-specific):
  - iPhone SE: 750 x 1334px
  - iPhone 8/8 Plus: 750 x 1334px / 1242 x 2208px
  - iPhone X/11/12/13/14: 1125 x 2436px
  - iPhone 14 Pro Max: 1284 x 2778px
  - Android: Various sizes (1284x2778px covers most)
- **Format**: PNG
- **Background Color**: `#020617` (defined in app.json)
- **Design Guidelines**:
  - Logo should be centered
  - Leave safe margins (don't put important content at edges)
  - Keep it simple and clean
  - Should load quickly (optimize file size)

## 🎯 Design Recommendations

### Color Scheme (Based on Your App)
- **Primary Colors**: 
  - Rose Pink: `#E91E63`
  - Soft Rose: `#F8BBD0`
  - Coral: `#FF6B9D`
- **Background**: `#020617` (dark) or `#FFF5F8` (light warm white)
- **Text**: High contrast (white on dark, dark on light)

### Logo Design Tips
1. **Simplicity**: Works at all sizes (from favicon to splash screen)
2. **Recognition**: Should be instantly recognizable
3. **Branding**: Consistent with your app's romantic/loving theme
4. **Scalability**: Vector-based design recommended (export to PNG at required sizes)

### Icon Design Best Practices
1. **Safe Zone**: Keep important elements in center 80% of icon
2. **No Text**: Avoid text in icons (hard to read at small sizes)
3. **High Contrast**: Ensure visibility on both light and dark backgrounds
4. **Test Small**: Always preview at 60x60px to see how it looks
5. **Consistent Style**: Match your app's design language

## 📐 Size Summary Table

| Asset | Size | Format | Notes |
|-------|------|--------|-------|
| **icon.png** | 1024 x 1024px | PNG | Main app icon (iOS & Android base) |
| **adaptive-icon.png** | 1024 x 1024px | PNG | Android adaptive icon (foreground) |
| **splash.png** | 1284 x 2778px | PNG | Splash screen (covers all devices) |
| **favicon.png** | 512 x 512px | PNG | Web favicon (or 48x48px minimum) |

## 🛠️ Tools for Creating Assets

### Design Tools
- **Figma** (Recommended) - Free, web-based, great for icons
- **Adobe Illustrator** - Professional vector design
- **Sketch** - Mac-only design tool
- **Canva** - Easy online design tool

### Icon Generators
- **Expo Asset Generator**: `npx expo-asset-generator`
- **App Icon Generator**: https://www.appicon.co/
- **Icon Kitchen** (Android): https://icon.kitchen/
- **MakeAppIcon**: https://makeappicon.com/

### Testing Tools
- **Icon Preview Apps**: Test how icons look on different devices
- **Expo Go**: Preview in development
- **Simulator/Emulator**: Test on actual device sizes

## 📋 Checklist Before Submitting

- [ ] **icon.png**: 1024x1024px, PNG, no transparency (iOS), high quality
- [ ] **adaptive-icon.png**: 1024x1024px, PNG, safe zone respected, works when cropped
- [ ] **splash.png**: 1284x2778px, PNG, centered logo, optimized file size
- [ ] **favicon.png**: 512x512px (or 48x48px), PNG, simplified design
- [ ] All icons tested at small sizes (60x60px preview)
- [ ] Icons work on both light and dark backgrounds
- [ ] File sizes optimized (not too large, not too compressed)
- [ ] Colors match your brand/design system
- [ ] No text in icons (or text is large enough to read at small sizes)

## 🎨 Design Inspiration for Lovelly

Given your app's theme (couples, love, connection), consider:
- **Heart icon** (simple, recognizable)
- **Two connected circles** (representing partners)
- **Romantic color palette** (roses, pinks, warm tones)
- **Soft, rounded shapes** (friendly, approachable)
- **Minimalist design** (clean, modern)

## 📝 File Structure

Your assets should be in:
```
/assets/
  ├── icon.png              (1024x1024px)
  ├── adaptive-icon.png     (1024x1024px)
  ├── splash.png            (1284x2778px)
  └── favicon.png           (512x512px or 48x48px)
```

## 🚀 Quick Start

1. **Design your icon** in Figma/Illustrator at 1024x1024px
2. **Export as PNG** for all required sizes
3. **Test in Expo Go** to see how it looks
4. **Optimize file sizes** (use tools like TinyPNG)
5. **Replace files** in `/assets/` folder
6. **Rebuild app** to see changes

## 💡 Pro Tips

1. **Start Big**: Design at 1024x1024px, then scale down
2. **Use Vectors**: Design in vector format, export to PNG
3. **Test Early**: Preview icons at actual device sizes
4. **Keep It Simple**: Complex designs don't work well at small sizes
5. **Brand Consistency**: Icons should match your app's UI design
6. **Background Colors**: Match your app's color scheme
7. **File Optimization**: Compress PNGs without losing quality

## 🔄 Updating Assets

After creating new assets:

1. Replace files in `/assets/` folder
2. Clear Expo cache: `npm run start:clear`
3. Rebuild app: `eas build --platform android --profile preview`
4. Test on real devices

---

**Note**: These specifications are based on Expo's requirements and current best practices. Always test on real devices to ensure icons display correctly!

