# Google Sign-In Setup Guide

This guide will help you configure Google Sign-In for your Lovelly app.

## Prerequisites

1. Firebase project set up (already done)
2. Google Sign-In enabled in Firebase Console

## Steps to Configure

### 1. Enable Google Sign-In in Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `lovelly-10644`
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Google** provider
5. Enable it and save
6. Note the **Web SDK configuration** - you'll need the **Web Client ID**

### 2. Get Your Web Client ID

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to **Your apps** section
3. Find your **Web app** (or create one if you don't have it)
4. Click on it to see the configuration
5. Look for **OAuth 2.0 Client IDs** section
6. Copy the **Web Client ID** (it looks like: `531044588348-XXXXX.apps.googleusercontent.com`)

### 3. Update the Client ID in Code

1. Open `/lib/googleAuth.ts`
2. Find this line:
   ```typescript
   const GOOGLE_WEB_CLIENT_ID = '531044588348-XXXXX.apps.googleusercontent.com';
   ```
3. Replace `'531044588348-XXXXX.apps.googleusercontent.com'` with your actual **Web Client ID** from step 2

### 4. Configure OAuth Redirect URIs (Optional but Recommended)

For production builds, you may need to configure redirect URIs:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID
5. Add authorized redirect URIs:
   - For Expo: `https://auth.expo.io/@your-username/lovelly`
   - For production: Your app's deep link scheme

## Testing

1. Run your app: `npm start`
2. Navigate to Login or Sign Up screen
3. Click "Continue with Google"
4. You should see Google's sign-in screen
5. After signing in, you'll be automatically logged into the app

## Troubleshooting

### Error: "No ID token received from Google"
- Make sure you're using the **Web Client ID**, not iOS/Android Client IDs
- Verify Google Sign-In is enabled in Firebase Console

### Error: "Redirect URI mismatch"
- Check that your redirect URIs are configured in Google Cloud Console
- For Expo Go, the redirect URI is automatically handled

### Sign-in works but user document not created
- Check Firestore rules to ensure users can write to their own document
- Check console logs for any Firestore errors

## Notes

- The same Web Client ID can be used for iOS, Android, and Web
- For production, you may want separate Client IDs for each platform
- Google Sign-In automatically creates/updates the user document in Firestore
- User's Google profile photo and name are automatically synced

