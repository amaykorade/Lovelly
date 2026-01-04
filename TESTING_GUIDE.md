# Testing Guide - One Android + One iPhone

Since you have one Android phone and one iPhone, here are the best ways to test your Lovelly app:

## Option 1: Cross-Platform Testing (Recommended) ⭐

**Test with your real Android phone + real iPhone**

This is the BEST option because:
- ✅ Tests real cross-platform functionality
- ✅ Tests real device performance
- ✅ Tests real location services
- ✅ Tests real notifications
- ✅ No emulator setup needed

### Steps:

1. **Build for both platforms:**
   ```bash
   # Build Android APK
   eas build --platform android --profile preview
   
   # Build iOS (if you have a Mac)
   eas build --platform ios --profile preview
   ```

2. **Install on both devices:**
   - Install Android APK on your Android phone
   - Install iOS build on your iPhone (via TestFlight or direct install)

3. **Test together:**
   - Create account on Android phone
   - Create account on iPhone
   - Connect them using pairing codes
   - Test all features (chat, location, drawing, calendar, widgets)

## Option 2: Android Emulator + Real Android Phone

**Use Android emulator on your computer + your real Android phone**

### Setup Android Emulator:

1. **Install Android Studio:**
   - Download from: https://developer.android.com/studio
   - Install Android SDK and emulator

2. **Create an Android Virtual Device (AVD):**
   - Open Android Studio
   - Go to Tools → Device Manager
   - Click "Create Device"
   - Choose a device (e.g., Pixel 6)
   - Download a system image (Android 13 or 14)
   - Finish setup

3. **Start the emulator:**
   ```bash
   # Start emulator from command line
   emulator -avd <your_avd_name>
   
   # Or start from Android Studio: Tools → Device Manager → Click Play button
   ```

4. **Run app on emulator:**
   ```bash
   # Start Expo dev server
   npm start
   
   # In another terminal, run on Android
   npm run android
   # This will automatically detect and use the emulator
   ```

5. **Install on real Android phone:**
   - Build APK: `eas build --platform android --profile preview`
   - Install APK on your phone

6. **Test together:**
   - Use emulator as one user
   - Use real phone as partner
   - Connect and test features

### Pros:
- ✅ Free (no additional devices needed)
- ✅ Easy to test Android-specific features
- ✅ Can test on different Android versions

### Cons:
- ❌ Emulator can be slow
- ❌ Location services may not work perfectly
- ❌ Some features (notifications, widgets) may not work in emulator

## Option 3: iOS Simulator + Real iPhone (Mac Only)

**Use iOS Simulator on your Mac + your real iPhone**

### Setup iOS Simulator:

1. **Install Xcode:**
   - Download from Mac App Store (free but large ~15GB)
   - Install Xcode Command Line Tools

2. **Open Simulator:**
   ```bash
   # List available simulators
   xcrun simctl list devices
   
   # Open Simulator
   open -a Simulator
   ```

3. **Run app on simulator:**
   ```bash
   # Start Expo dev server
   npm start
   
   # In another terminal, run on iOS
   npm run ios
   # This will automatically open simulator
   ```

4. **Install on real iPhone:**
   - Build iOS: `eas build --platform ios --profile preview`
   - Install via TestFlight or direct install

5. **Test together:**
   - Use simulator as one user
   - Use real iPhone as partner
   - Connect and test features

### Pros:
- ✅ Free (if you have a Mac)
- ✅ Easy to test iOS-specific features
- ✅ Can test on different iOS versions

### Cons:
- ❌ Requires Mac
- ❌ Location services may not work perfectly
- ❌ Some features (notifications, widgets) may not work in simulator

## Option 4: Use Expo Go (Quick Testing)

**For quick testing without building**

### Steps:

1. **Install Expo Go on both devices:**
   - Android: Install from Google Play Store
   - iOS: Install from App Store

2. **Start dev server:**
   ```bash
   npm start
   # Or for better connectivity:
   npm run start:tunnel
   ```

3. **Scan QR codes:**
   - Scan QR code on Android phone with Expo Go
   - Scan QR code on iPhone with Expo Go (Camera app)

4. **Test together:**
   - Both devices will load the app
   - Connect and test features

### Pros:
- ✅ Fastest setup
- ✅ No build needed
- ✅ Easy to test code changes

### Cons:
- ❌ Widgets won't work (requires development build)
- ❌ Some native features may be limited
- ❌ Not production-like testing

## Recommended Testing Workflow

### For Development:
1. Use **Expo Go** on both devices for quick iteration
2. Test UI/UX changes immediately
3. Test basic functionality

### For Production Testing:
1. Use **Option 1** (Real Android + Real iPhone)
2. Build preview builds for both platforms
3. Test all features thoroughly:
   - ✅ Account creation (email + Google)
   - ✅ Partner pairing
   - ✅ Real-time chat
   - ✅ Location sharing
   - ✅ Drawing together
   - ✅ Calendar events
   - ✅ Widgets (Android)
   - ✅ Notifications
   - ✅ Cross-platform compatibility

## Testing Checklist

When testing with two devices, verify:

- [ ] **Authentication:**
  - [ ] Email sign up/login works on both
  - [ ] Google sign in works on both
  - [ ] Profile creation works

- [ ] **Pairing:**
  - [ ] Generate code on one device
  - [ ] Enter code on other device
  - [ ] Connection successful
  - [ ] Both devices show connected status

- [ ] **Real-time Features:**
  - [ ] Chat messages appear instantly on both devices
  - [ ] Location updates in real-time
  - [ ] Drawing syncs in real-time
  - [ ] Calendar events sync

- [ ] **Location:**
  - [ ] Map shows both locations
  - [ ] Distance calculation works
  - [ ] Widget shows correct distance (Android)

- [ ] **Notifications:**
  - [ ] Chat notifications work
  - [ ] Calendar reminders work
  - [ ] Drawing notifications work

- [ ] **Cross-Platform:**
  - [ ] All features work between Android and iOS
  - [ ] Data syncs correctly
  - [ ] UI looks good on both platforms

## Troubleshooting

### Emulator/Simulator Issues:

**Android Emulator:**
- If emulator is slow, increase RAM allocation in AVD settings
- Enable hardware acceleration
- Use a system image with Google Play Services

**iOS Simulator:**
- Make sure Xcode is up to date
- Use a recent iOS version
- Some features require real device

### Connection Issues:

**Devices can't connect:**
- Make sure both devices are on the same network
- Check Firebase connection
- Verify pairing codes are correct

**Real-time features not working:**
- Check internet connection
- Verify Firestore rules allow read/write
- Check console for errors

## Quick Start Commands

```bash
# Start dev server (for Expo Go)
npm start

# Start with tunnel (better for remote devices)
npm run start:tunnel

# Run on Android emulator
npm run android

# Run on iOS simulator (Mac only)
npm run ios

# Build Android APK
eas build --platform android --profile preview

# Build iOS (Mac only)
eas build --platform ios --profile preview
```

## Best Practice

**For your situation (1 Android + 1 iPhone):**

1. **Start with Expo Go** - Quick testing and development
2. **Build preview builds** - Test production-like experience
3. **Use real devices** - Best for final testing before release

This gives you the best of both worlds: fast iteration and thorough testing!

