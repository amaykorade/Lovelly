#!/bin/bash

# Script to prepare app assets from heart logo
# This script will resize your heart logo to all required sizes

SOURCE_FILE=""
if [ -f "assets/Red Heart target.png" ]; then
    SOURCE_FILE="assets/Red Heart target.png"
elif [ -f "assets/Red Heart target (1).png" ]; then
    SOURCE_FILE="assets/Red Heart target (1).png"
elif [ -f "assets/Red Heart target (2).png" ]; then
    SOURCE_FILE="assets/Red Heart target (2).png"
else
    echo "Error: No heart logo file found!"
    exit 1
fi

echo "Using source file: $SOURCE_FILE"
echo "Preparing assets..."

# Check if ImageMagick (convert) is available
if command -v convert &> /dev/null; then
    echo "Using ImageMagick..."
    
    # Create icon.png (1024x1024)
    convert "$SOURCE_FILE" -resize 1024x1024 -background white -gravity center -extent 1024x1024 "assets/icon.png"
    echo "✓ Created icon.png (1024x1024)"
    
    # Create adaptive-icon.png (1024x1024) - can have transparency
    convert "$SOURCE_FILE" -resize 1024x1024 -background transparent -gravity center -extent 1024x1024 "assets/adaptive-icon.png"
    echo "✓ Created adaptive-icon.png (1024x1024)"
    
    # Create splash.png (1284x2778) - centered on background
    convert -size 1284x2778 xc:"#020617" "$SOURCE_FILE" -resize 800x800 -gravity center -composite "assets/splash.png"
    echo "✓ Created splash.png (1284x2778)"
    
    # Create favicon.png (512x512)
    convert "$SOURCE_FILE" -resize 512x512 -background white -gravity center -extent 512x512 "assets/favicon.png"
    echo "✓ Created favicon.png (512x512)"
    
# Check if sips (macOS) is available
elif command -v sips &> /dev/null; then
    echo "Using macOS sips..."
    
    # Create icon.png (1024x1024)
    sips -z 1024 1024 "$SOURCE_FILE" --out "assets/icon.png" &> /dev/null
    echo "✓ Created icon.png (1024x1024)"
    
    # Create adaptive-icon.png (1024x1024)
    cp "$SOURCE_FILE" "assets/adaptive-icon.png"
    sips -z 1024 1024 "assets/adaptive-icon.png" &> /dev/null
    echo "✓ Created adaptive-icon.png (1024x1024)"
    
    # Create favicon.png (512x512)
    sips -z 512 512 "$SOURCE_FILE" --out "assets/favicon.png" &> /dev/null
    echo "✓ Created favicon.png (512x512)"
    
    # For splash, we'll need to create a canvas and composite
    echo "⚠ Note: splash.png needs manual creation (1284x2778 with centered logo)"
    echo "   You can use an image editor to create splash.png"
    
else
    echo "Error: No image conversion tool found!"
    echo "Please install ImageMagick (brew install imagemagick) or use an online tool"
    echo ""
    echo "Required sizes:"
    echo "  - icon.png: 1024x1024px"
    echo "  - adaptive-icon.png: 1024x1024px"
    echo "  - splash.png: 1284x2778px (with centered logo)"
    echo "  - favicon.png: 512x512px"
    exit 1
fi

echo ""
echo "✅ Assets prepared! Files created in assets/ folder"
echo ""
echo "Next steps:"
echo "1. Review the generated files"
echo "2. For splash.png, you may want to manually adjust the logo size/position"
echo "3. Rebuild your app: eas build --platform android --profile preview"

