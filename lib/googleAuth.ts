import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

// Complete the auth session for web
WebBrowser.maybeCompleteAuthSession();

// Google OAuth configuration
// Get your Web Client ID from Firebase Console:
// Project Settings -> Your Apps -> Web App -> OAuth 2.0 Client IDs
// Use the Web Client ID (not iOS/Android) for Expo
// You can find this in Firebase Console under Authentication -> Sign-in method -> Google -> Web SDK configuration
const GOOGLE_WEB_CLIENT_ID = '531044588348-vbc519ukv9dr9s6olc029a18n9de9b42.apps.googleusercontent.com';

// Hook version for use in components
export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_WEB_CLIENT_ID, // For iOS, you can use the same or a different client ID
    androidClientId: GOOGLE_WEB_CLIENT_ID, // For Android, you can use the same or a different client ID
    scopes: ['profile', 'email'],
    responseType: 'id_token',
  });

  const signIn = async () => {
    try {
      const result = await promptAsync();

      if (result.type === 'success') {
        const { id_token } = result.params;
        
        if (!id_token) {
          throw new Error('No ID token received from Google');
        }

        // Create a Google credential
        const credential = GoogleAuthProvider.credential(id_token);

        // Sign in to Firebase with the Google credential
        const userCredential = await signInWithCredential(auth, credential);
        const user = userCredential.user;

        // Check if user document exists, if not create it
        console.log("Checking/creating user document in Firestore for:", user.uid);
        const userRef = doc(db, 'users', user.uid);
        let userSnap;
        try {
          userSnap = await getDoc(userRef);
          console.log("User document exists:", userSnap.exists());
        } catch (getError: any) {
          console.error("Error checking user document:", getError);
          throw new Error(`Failed to check user profile: ${getError.message}`);
        }

        if (!userSnap.exists()) {
          // Create user document with Google profile info
          console.log("Creating new user document...");
          const displayName = user.displayName || '';
          const nameParts = displayName.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          try {
            await setDoc(userRef, {
              name: displayName || 'User',
              firstName: firstName,
              lastName: lastName,
              email: user.email,
              photoURL: user.photoURL || null,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              authProvider: 'google',
            });
            console.log("User document created successfully");
          } catch (createError: any) {
            console.error("Error creating user document:", createError);
            console.error("Error code:", createError.code);
            console.error("Error message:", createError.message);
            if (createError.code === 'permission-denied') {
              throw new Error("Permission denied. Please check Firestore security rules are deployed correctly.");
            }
            throw new Error(`Failed to create user profile: ${createError.message}`);
          }
        } else {
          // Update existing user document with latest info
          console.log("Updating existing user document...");
          try {
            await setDoc(userRef, {
              name: user.displayName || userSnap.data().name,
              email: user.email,
              photoURL: user.photoURL || userSnap.data().photoURL,
              updatedAt: serverTimestamp(),
            }, { merge: true });
            console.log("User document updated successfully");
          } catch (updateError: any) {
            console.error("Error updating user document:", updateError);
            // Don't throw - this is not critical for sign-in
          }
        }

        return userCredential;
      } else if (result.type === 'cancel') {
        throw new Error('Google sign-in was cancelled');
      } else {
        throw new Error(`Google sign-in failed: ${result.type}`);
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  };

  return { signIn, loading: !request };
}

