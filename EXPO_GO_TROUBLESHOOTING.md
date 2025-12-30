# Expo Go Troubleshooting Guide

## Error: "java.io.IOException: Failed to download remote update"

This error occurs when Expo Go cannot connect to your development server. Here are solutions:

### For Firestore Emulator Users

If you're using the Firestore emulator (with `npm run start:emulator`), try:

**Option 1: Use tunnel mode with emulator (Recommended)**
```bash
npm run start:emulator:tunnel
```

**Option 2: Use regular emulator command with cleared cache**
```bash
npm run start:emulator
```

The emulator command already includes `--clear` flag to fix cache issues.

### Solution 1: Clear Cache and Restart (Recommended First Step)

```bash
npm run start:clear
```

Or manually:
```bash
npx expo start --clear
```

### Solution 2: Use Tunnel Mode (Works Across Networks)

If your phone and computer are on different networks, use tunnel mode:

```bash
npm run start:tunnel
```

Or manually:
```bash
npx expo start --tunnel
```

**Note:** Tunnel mode uses Expo's servers and may be slower, but works from anywhere.

### Solution 3: Ensure Same Network (LAN Mode)

1. Make sure your phone and computer are on the **same Wi-Fi network**
2. Check your computer's local IP address:
   - **Mac/Linux**: `ifconfig | grep "inet "`
   - **Windows**: `ipconfig`
3. Start with LAN mode:
   ```bash
   npm run start:lan
   ```
4. Scan the QR code again

### Solution 4: Check Firewall Settings

Your firewall might be blocking the connection:

**Mac:**
1. System Settings → Network → Firewall
2. Make sure Metro bundler (port 8081) is allowed
3. Or temporarily disable firewall to test

**Windows:**
1. Windows Defender Firewall → Allow an app
2. Allow Node.js and Metro bundler through firewall

### Solution 5: Use Manual Connection

1. Start the server: `npm start`
2. Press `s` to switch connection type
3. Choose "Tunnel" or "LAN" based on your network
4. Scan the QR code again

### Solution 6: Check Network Connection

1. **Verify phone and computer are on same Wi-Fi:**
   - Phone: Settings → Wi-Fi → Check network name
   - Computer: Check Wi-Fi network name
   - They must match exactly

2. **Test connectivity:**
   - On your phone's browser, try accessing: `http://[YOUR_COMPUTER_IP]:8081`
   - If it doesn't load, there's a network issue

### Solution 7: Restart Everything

1. Stop the Expo server (Ctrl+C)
2. Close Expo Go app completely
3. Restart with: `npm run start:clear`
4. Reopen Expo Go and scan QR code

### Solution 8: Update Expo Go App

Make sure you have the latest version of Expo Go:
- **iOS**: Update from App Store
- **Android**: Update from Google Play Store

### Solution 9: Check for Port Conflicts

If port 8081 is in use:
```bash
# Kill process on port 8081 (Mac/Linux)
lsof -ti:8081 | xargs kill -9

# Or use a different port
npx expo start --port 8082
```

### Solution 10: Use Development Build Instead

If Expo Go continues to have issues, consider using a development build:
```bash
# For Android
npm run android

# For iOS (Mac only)
npm run ios
```

This builds the app directly on your device/emulator without needing Expo Go.

## Quick Fix Checklist

- [ ] Clear cache: `npm run start:clear`
- [ ] Ensure same Wi-Fi network
- [ ] Try tunnel mode: `npm run start:tunnel`
- [ ] Check firewall settings
- [ ] Update Expo Go app
- [ ] Restart Expo server and Expo Go app
- [ ] Check if port 8081 is available

## Still Having Issues?

1. Check Expo CLI version: `npx expo --version`
2. Update if needed: `npm install -g expo-cli@latest`
3. Check Metro bundler logs for specific errors
4. Try using the Expo Dev Tools in browser (usually opens automatically)

