# Widget Testing Guide

## Important: Widgets require a development build
Widgets use native code (iOS WidgetKit and Android App Widgets), so they **cannot** be tested with Expo Go. You need to build and install a development build on your device.

---

## Testing on iOS (iPhone)

### Prerequisites:
1. **Mac computer** with Xcode installed
2. **Apple Developer Account** (free account works for development)
3. **iPhone** connected via USB or on the same network

### Steps:

1. **Connect your iPhone to your Mac** via USB, or ensure both are on the same Wi-Fi network

2. **Build and install the app on your iPhone:**
   ```bash
   npm run ios
   ```
   Or if you want to specify a device:
   ```bash
   npx expo run:ios --device
   ```

3. **Trust the developer certificate on your iPhone:**
   - Go to **Settings > General > VPN & Device Management**
   - Find your developer certificate and tap **Trust**

4. **Add the widget to your home screen:**
   - Long press on your home screen
   - Tap the **+** button in the top-left corner
   - Search for "Lovelly" or "Partner Distance"
   - Select the widget size (Small or Medium)
   - Tap **Add Widget**
   - Position it where you want

5. **Test the widget:**
   - Make sure you're logged in and connected to a partner
   - Enable "Distance Widget" in Settings
   - The widget should show the distance between you and your partner
   - Move around to see the distance update (updates every 30 seconds)

---

## Testing on Android

### Option 1: EAS Build (Recommended - No USB Required) ⭐

This is the **easiest method** if you don't have a USB cable. Expo's cloud service builds the app and gives you a download link.

#### Prerequisites:
1. **Expo account** (free) - Sign up at https://expo.dev
2. **EAS CLI** installed

#### Steps:

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo:**
   ```bash
   eas login
   ```

3. **Configure EAS (first time only):**
   ```bash
   eas build:configure
   ```
   This creates an `eas.json` file.

4. **Build Android APK:**
   ```bash
   eas build --platform android --profile development
   ```
   This will:
   - Upload your code to Expo's servers
   - Build the app in the cloud
   - Give you a download link (takes 10-20 minutes)

5. **Download and install on your phone:**
   - Open the download link on your Android phone
   - Download the APK file
   - Tap the downloaded file to install
   - You may need to enable "Install from Unknown Sources" in Settings

6. **Add the widget:**
   - Long press on your home screen
   - Tap **Widgets** → Find "Lovelly" → Add widget

---

### Option 2: Build APK Locally and Transfer

Build the APK on your computer, then transfer it to your phone via email/cloud storage.

#### Steps:

1. **Build the APK:**
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
   The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

2. **Transfer APK to your phone:**
   - **Email**: Email the APK to yourself, open on phone
   - **Cloud Storage**: Upload to Google Drive/Dropbox, download on phone
   - **AirDrop/Share**: Use any file sharing method

3. **Install on your phone:**
   - Open the APK file on your Android phone
   - Tap "Install"
   - Enable "Install from Unknown Sources" if prompted

4. **Add the widget:**
   - Long press home screen → Widgets → Find "Lovelly" → Add

---

### Option 3: Wireless ADB (If Previously Connected)

If you've connected your phone via USB before, you can use wireless debugging.

#### Steps:

1. **Connect via USB once** (borrow a cable or use a friend's computer):
   - Enable USB Debugging (Settings > Developer Options)
   - Connect via USB
   - Run: `adb tcpip 5555`
   - Disconnect USB

2. **Connect wirelessly:**
   - Find your phone's IP address (Settings > About Phone > Status > IP Address)
   - On your computer, run:
     ```bash
     adb connect YOUR_PHONE_IP:5555
     ```
   - Example: `adb connect 192.168.1.100:5555`

3. **Build and install:**
   ```bash
   npm run android
   ```

4. **Add the widget:**
   - Long press home screen → Widgets → Find "Lovelly" → Add

---

### Option 4: Traditional USB Method (If You Get a Cable)

1. **Enable USB Debugging:**
   - Settings > About Phone > Tap Build Number 7 times
   - Settings > Developer Options > Enable USB Debugging

2. **Connect via USB and build:**
   ```bash
   npm run android
   ```

3. **Add the widget:**
   - Long press home screen → Widgets → Find "Lovelly" → Add

---

## Troubleshooting

### Widget not showing up:
1. **Make sure the app is installed** - Widgets only appear after the app is installed
2. **Check widget settings** - Go to Settings in the app and ensure "Distance Widget" is enabled
3. **Restart your device** - Sometimes widgets need a device restart to appear
4. **Check logs** - Look for widget-related errors in the console

### Widget not updating:
1. **Check location permissions** - Make sure location permissions are granted
2. **Check partner connection** - Ensure you're connected to a partner
3. **Check location sharing** - Make sure location sharing is enabled in Settings
4. **Wait 30 seconds** - Widgets update every 30 seconds (throttled)

### iOS-specific issues:
- **App Group not configured**: Make sure the App Group identifier matches in Xcode
- **Widget extension not included**: Check that the widget extension is included in the build

### Android-specific issues:
- **SharedPreferences not accessible**: Make sure the widget provider can read from SharedPreferences
- **Broadcast receiver not registered**: Check AndroidManifest.xml for the widget provider

---

## Development Build vs Production Build

### Development Build (Current):
- Built with `expo run:ios` or `expo run:android`
- Includes development tools
- Can be installed directly on your device
- Good for testing widgets during development

### Production Build:
- Built with `eas build` or through App Store/Play Store
- Optimized and signed for distribution
- Required for App Store/Play Store submission
- Widgets work the same way

---

## Quick Test Checklist

- [ ] App builds and installs successfully
- [ ] Widget appears in widget picker
- [ ] Widget can be added to home screen
- [ ] Widget shows "Not Connected" when not paired
- [ ] Widget shows distance when connected
- [ ] Widget updates when location changes
- [ ] Widget updates when distance changes
- [ ] Widget shows partner name correctly
- [ ] Widget shows correct distance format (km/m)

---

## Notes

- Widgets update every 30 seconds (throttled to save battery)
- Widgets require location permissions to work
- Widgets require partner connection to show distance
- Widgets work in the background (even when app is closed)
- Widget data is stored in shared storage (iOS App Groups, Android SharedPreferences)

