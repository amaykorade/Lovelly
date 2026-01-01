# Google Sign-In Setup Guide

This guide will help you configure Google Sign-In for your Lovelly app.

## Prerequisites

- Firebase project with Authentication enabled
- Google Cloud Console access

## Step 1: Enable Google Sign-In in Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`lovelly-10644`)
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Google** provider
5. Enable it and note the **Web client ID** (you'll need this)
6. Click **Save**

## Step 2: Get Google OAuth Client ID

The Web client ID from Firebase is what you need. It looks like:
```
123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
```

## Step 3: Configure Environment Variable

You need to set the Google OAuth client ID as an environment variable.

### Option A: Using .env file (for local development)

1. Create a `.env` file in the project root (if it doesn't exist)
2. Add the following line:
   ```
   EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-web-client-id-here.apps.googleusercontent.com
   ```
3. Replace `your-web-client-id-here` with your actual Web client ID from Firebase

### Option B: Using EAS Secrets (for production builds)

1. Install EAS CLI if you haven't:
   ```bash
   npm install -g eas-cli
   ```

2. Set the secret:
   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_CLIENT_ID --value your-web-client-id-here.apps.googleusercontent.com
   ```

3. The secret will be automatically available in your EAS builds

## Step 4: Update app.json (if needed)

The app is already configured with the scheme `lovelly` which is used for OAuth redirects. No changes needed unless you want to customize it.

## Step 5: Test Google Sign-In

1. Start your development server:
   ```bash
   npm start
   ```

2. Open the app and navigate to the Login or Sign Up screen
3. Click the "Continue with Google" button
4. You should see the Google sign-in flow

## Troubleshooting

### "Google OAuth is not configured" error

- Make sure you've set `EXPO_PUBLIC_GOOGLE_CLIENT_ID` in your `.env` file or EAS secrets
- Restart your development server after adding the environment variable
- For EAS builds, make sure the secret is set correctly

### "No ID token received from Google" error

- Verify that the Web client ID is correct
- Make sure Google Sign-In is enabled in Firebase Console
- Check that the redirect URI matches your app scheme

### Sign-in works in development but not in production

- Make sure you've set the secret in EAS: `eas secret:create`
- Rebuild your app after setting the secret
- Verify the secret is available: `eas secret:list`

## Additional Notes

- The Google Sign-In button appears on:
  - AuthScreen (main auth screen)
  - LoginScreen
  - SignUpScreen

- When a user signs in with Google:
  - Their profile information (name, email, photo) is automatically saved to Firestore
  - If it's a new user, a user document is created
  - If it's an existing user, their profile is updated

- The OAuth flow uses Expo's proxy service, which works in both development and production builds

## Security Notes

- Never commit your `.env` file to version control
- The `.env` file is already in `.gitignore`
- Use EAS secrets for production builds
- The Web client ID is safe to use in client-side code (it's public)

