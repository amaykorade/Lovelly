# Creating Splash Screen

Since automated splash creation isn't available, here's how to create it manually:

## Option 1: Using Online Tool (Easiest)

1. Go to: https://www.figma.com or https://www.canva.com
2. Create a new design: 1284 x 2778 pixels
3. Set background color: `#020617` (dark blue-black)
4. Import your heart logo: `Red Heart target (1).png`
5. Resize logo to about 600-800px
6. Center it on the canvas
7. Export as PNG: `splash.png`
8. Save to `/assets/splash.png`

## Option 2: Using Image Editor

### Photoshop/GIMP:
1. Create new image: 1284 x 2778 pixels
2. Fill background with `#020617`
3. Import heart logo
4. Resize to ~600-800px
5. Center horizontally and vertically
6. Export as PNG

### Preview (macOS):
1. Open heart logo in Preview
2. Tools → Adjust Size → Set to 600x600px
3. Create new image: 1284x2778px
4. Fill with background color
5. Copy/paste heart and center it

## Quick Command (if you have ImageMagick):

```bash
brew install imagemagick
convert -size 1284x2778 xc:"#020617" "assets/Red Heart target (1).png" -resize 600x600 -gravity center -composite "assets/splash.png"
```

## Current Status

✅ **icon.png** - Created (1024x1024)
✅ **adaptive-icon.png** - Created (1024x1024)  
✅ **favicon.png** - Created (512x512)
⏳ **splash.png** - Needs to be created (1284x2778)

Once splash.png is created, all assets will be ready!

