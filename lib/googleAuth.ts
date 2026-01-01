import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from './firebase';

// Complete the auth session for better UX
WebBrowser.maybeCompleteAuthSession();

// Google OAuth configuration
const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

// Get Google OAuth client ID from environment or use a default
// You need to configure this in Firebase Console:
// Firebase Console -> Authentication -> Sign-in method -> Google -> Web SDK configuration
const getGoogleOAuthConfig = () => {
  // For Expo, you can use the Web client ID from Firebase
  // Set this in your .env file or eas.json secrets
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
  
  if (!clientId) {
    console.warn('Google OAuth client ID not configured. Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID');
  }

  return {
    clientId,
    scopes: ['openid', 'profile', 'email'],
    responseType: AuthSession.ResponseType.IdToken, // Use IdToken to get ID token for Firebase
    redirectUri: AuthSession.makeRedirectUri({
      scheme: 'lovelly',
      path: 'oauth',
    }),
  };
};

export const signInWithGoogle = async () => {
  try {
    const config = getGoogleOAuthConfig();
    
    if (!config.clientId) {
      throw new Error('Google OAuth is not configured. Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID in your environment variables.');
    }

    // Request authentication
    const request = new AuthSession.AuthRequest({
      clientId: config.clientId,
      scopes: config.scopes,
      responseType: config.responseType,
      redirectUri: config.redirectUri,
      usePKCE: false, // Google OAuth doesn't require PKCE for mobile apps
    });

    // Start the authentication flow
    const result = await request.promptAsync(discovery, {
      useProxy: true, // Use Expo's proxy for OAuth (works in development and production)
      showInRecents: true,
    });

    if (result.type === 'success') {
      // Extract the ID token from the result
      const { id_token } = result.params;
      
      if (!id_token) {
        throw new Error('No ID token received from Google');
      }

      // Create a Google credential with the ID token
      const credential = GoogleAuthProvider.credential(id_token);
      
      // Sign in to Firebase with the Google credential
      const userCredential = await signInWithCredential(auth, credential);
      
      return userCredential;
    } else if (result.type === 'error') {
      const errorMessage = result.error?.message || 'Google sign-in was cancelled or failed';
      if (errorMessage.includes('cancelled') || errorMessage.includes('dismissed')) {
        throw new Error('Google sign-in was cancelled');
      }
      throw new Error(errorMessage);
    } else {
      throw new Error('Google sign-in was cancelled');
    }
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    // Re-throw with a user-friendly message
    if (error.message?.includes('cancelled')) {
      throw new Error('Sign-in was cancelled');
    }
    throw error;
  }
};

