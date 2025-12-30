# Lovelly - React Native App

A cross-platform mobile application built with React Native and Expo, supporting both Android and iOS.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or later)
- **npm** or **yarn**
- **Expo CLI** (optional, but recommended): `npm install -g expo-cli`

For iOS development (macOS only):
- **Xcode** (latest version from App Store)
- **CocoaPods**: `sudo gem install cocoapods`

For Android development:
- **Android Studio** with Android SDK
- **Java Development Kit (JDK)** 11 or later
- Configure `ANDROID_HOME` environment variable

## Installation

1. Install dependencies:
```bash
npm install
```

or

```bash
yarn install
```

## Running the App

### Start the development server:
```bash
npm start
```

or

```bash
yarn start
```

This will start the Expo development server and show you a QR code.

### Run on iOS Simulator (macOS only):
```bash
npm run ios
```

### Run on Android Emulator:
```bash
npm run android
```

### Run on Web:
```bash
npm run web
```

## Testing on Physical Devices

### iOS:
1. Install **Expo Go** app from the App Store on your iPhone
2. Scan the QR code from the terminal/browser
3. The app will load on your device

### Android:
1. Install **Expo Go** app from Google Play Store on your Android device
2. Scan the QR code from the terminal/browser
3. The app will load on your device

## Project Structure

```
lovelly/
├── App.js              # Main application component
├── app.json            # Expo configuration
├── package.json        # Dependencies and scripts
├── babel.config.js     # Babel configuration (includes NativeWind)
├── metro.config.js     # Metro bundler configuration (includes NativeWind)
├── tailwind.config.js  # Tailwind CSS configuration
├── nativecn-preset.js  # NativeCN theme preset (shadcn/ui)
├── global.css          # Global Tailwind CSS styles
├── components/         # UI components directory
│   └── ui/            # shadcn/ui components (add via NativeCN CLI)
├── assets/             # Images, fonts, and other assets
└── README.md           # This file
```

## Styling with Tailwind CSS & shadcn/ui

This project uses:
- **NativeWind** - Tailwind CSS for React Native
- **NativeCN** - shadcn/ui components for React Native

### Using Tailwind CSS

You can use Tailwind utility classes directly in your components:

```jsx
import { View, Text } from 'react-native';

export default function MyComponent() {
  return (
    <View className="flex-1 bg-blue-500 p-4">
      <Text className="text-white text-xl font-bold">
        Hello Tailwind!
      </Text>
    </View>
  );
}
```

### Adding shadcn/ui Components

To add a component from NativeCN (shadcn/ui for React Native):

```bash
npx @nativecn/cli add button
npx @nativecn/cli add card
npx @nativecn/cli add input
```

Then use it in your code:

```jsx
import { Button } from './components/ui/button';

export default function MyScreen() {
  return (
    <Button className="bg-primary">
      Click Me
    </Button>
  );
}
```

See `components/README.md` for more details on available components.

## Development

The app uses:
- **React Native** - Cross-platform mobile framework
- **Expo** - Development platform and tooling
- **Metro** - JavaScript bundler
- **NativeWind** - Tailwind CSS for React Native
- **NativeCN** - shadcn/ui component library for React Native

## Building for Production

When you're ready to build for production:

1. **For iOS**: Use Expo's build service or eject to use Xcode
2. **For Android**: Use Expo's build service or eject to use Android Studio

Check the [Expo documentation](https://docs.expo.dev/) for detailed build instructions.

## Notes

- The app is currently using Expo's managed workflow, which makes development easier
- If you need native modules not supported by Expo, you can eject using `expo eject` (not reversible)
- Make sure to update the app name, bundle identifier, and package name in `app.json` for production builds

