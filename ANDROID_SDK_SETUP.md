# Android SDK Setup for Local Builds

## Install Android Studio

1. **Download Android Studio:**
   - Go to https://developer.android.com/studio
   - Download and install Android Studio

2. **Open Android Studio:**
   - Launch Android Studio
   - Go through the setup wizard
   - Install Android SDK (it will prompt you)

3. **Find your SDK location:**
   - Open Android Studio
   - Go to **Preferences** (Mac) or **Settings** (Windows/Linux)
   - Go to **Appearance & Behavior > System Settings > Android SDK**
   - Note the "Android SDK Location" path (usually `~/Library/Android/sdk` on Mac)

4. **Set ANDROID_HOME environment variable:**

   **For Mac/Linux (add to ~/.zshrc or ~/.bashrc):**
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   ```

   Then reload:
   ```bash
   source ~/.zshrc
   ```

   **For Windows (add to Environment Variables):**
   - Add `ANDROID_HOME` = `C:\Users\YourName\AppData\Local\Android\Sdk`
   - Add to PATH: `%ANDROID_HOME%\platform-tools`

5. **Create local.properties file:**
   ```bash
   echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties
   ```

6. **Verify setup:**
   ```bash
   echo $ANDROID_HOME
   adb version
   ```

7. **Build APK:**
   ```bash
   cd android
   ./gradlew assembleDebug
   ```

The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

