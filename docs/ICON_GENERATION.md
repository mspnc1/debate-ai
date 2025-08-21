# App Icon Generation Guide

## Overview
The Symposium AI app uses the Forum Circle design as its app icon - a pattern of 9 overlapping colored circles representing different AI providers on a dark background.

## Icon Component
The icon is generated programmatically using the `AppIconGenerator` component located at:
`src/components/organisms/AppIconGenerator.tsx`

## Required Icon Files

### iOS Icons
- `icon.png` - 1024x1024px (App Store)
- Additional sizes generated automatically by Expo

### Android Icons
- `adaptive-icon.png` - 1024x1024px (foreground layer)
- Background color: `#1A1A1A` (configured in app.json)

### Web Icons
- `favicon.png` - 48x48px

### Splash Screen
- `splash-icon.png` - 512x512px (centered on dark background)

## Generation Methods

### Method 1: Using the Export Utility (Recommended for Development)
1. Import the `ExportAppIcon` component from `src/utils/exportAppIcon.tsx`
2. Temporarily add it to a screen
3. Use the export buttons to generate each icon size
4. Save the generated files to the `assets/` directory

### Method 2: Manual Screenshot Method
1. Run the app in development mode
2. Navigate to a screen showing the `AppIconGenerator`
3. Take screenshots at different sizes
4. Crop and save as PNG files

### Method 3: Using React Native SVG to PNG (Production)
```bash
# Install the conversion tool
npm install -g react-native-svg-to-png

# Generate icons at different sizes
npx react-native-svg-to-png --size 1024 --output ./assets/icon.png
npx react-native-svg-to-png --size 1024 --output ./assets/adaptive-icon.png
npx react-native-svg-to-png --size 512 --output ./assets/splash-icon.png
npx react-native-svg-to-png --size 48 --output ./assets/favicon.png
```

### Method 4: Using Expo Export (Simplest)
```bash
# Use Expo's built-in icon generation
expo export:web
# Icons will be generated in the web-build folder
```

## Icon Specifications

### Forum Circle Design
- **Background**: Dark (#1A1A1A)
- **Elements**: 9 overlapping circles in AI provider colors
- **Layout**: Circular arrangement with tight spacing
- **Center**: Small dark circle matching background
- **Effects**: Subtle glow (15% opacity) around each circle

### AI Provider Colors
- Claude: #C15F3C
- ChatGPT: #10A37F  
- Gemini: #4888F8
- Perplexity: #20808D
- Mistral: #FA520F
- Cohere: #FF7759
- Together: #0F6FFF
- DeepSeek: #4D6BFE
- Grok: #1DA1F2

## File Locations
All generated icon files should be placed in the `/assets/` directory:
```
assets/
├── icon.png           # Main app icon (1024x1024)
├── adaptive-icon.png  # Android adaptive icon (1024x1024)
├── splash-icon.png    # Splash screen icon (512x512)
└── favicon.png        # Web favicon (48x48)
```

## Testing Icons
After generating new icons:
1. Clear the Expo cache: `expo start -c`
2. Rebuild the app for testing
3. Verify icons appear correctly on all platforms

## Notes
- The dark background (#1A1A1A) is configured in `app.json` for consistency
- Icons should be exported as PNG with transparency preserved
- For production builds, ensure all icon files are optimized for size