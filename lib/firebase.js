import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth, getReactNativePersistence } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// TODO: Replace these placeholder values with your actual Firebase project config.
// You can find this in the Firebase Console under:
// Project Settings -> Your Apps -> SDK setup and configuration -> "Firebase SDK snippet" (Config).
const firebaseConfig = {
    apiKey: "AIzaSyAnsRlVk7onnSsKrz7-KN-QfC8F770dQ_c",
    authDomain: "lovelly-10644.firebaseapp.com",
    projectId: "lovelly-10644",
    storageBucket: "lovelly-10644.firebasestorage.app",
    messagingSenderId: "531044588348",
    appId: "1:531044588348:web:6f3f9539b7c20c3ac41c39",
    measurementId: "G-RKXHE895WW"
  };

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize auth with platform-specific persistence
// On web, use getAuth() which uses browser localStorage
// On native, use initializeAuth with AsyncStorage persistence
let auth;
try {
  if (Platform.OS === 'web') {
    // Web: use getAuth() which automatically uses browser localStorage
    auth = getAuth(app);
  } else {
    // Native: use initializeAuth with AsyncStorage persistence
    // Check if getReactNativePersistence and AsyncStorage are available
    if (typeof getReactNativePersistence === 'function' && AsyncStorage) {
      try {
        auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
      } catch (initError) {
        // If already initialized, get the existing instance
        if (
          initError.message?.includes('already initialized') || 
          initError.code?.includes('already-initialized')
        ) {
          auth = getAuth(app);
        } else {
          console.warn('Failed to initialize auth with persistence, falling back to getAuth:', initError);
          auth = getAuth(app);
        }
      }
    } else {
      // Fallback if getReactNativePersistence or AsyncStorage is not available
      console.warn('getReactNativePersistence or AsyncStorage not available, using getAuth()');
      auth = getAuth(app);
    }
  }
} catch (error) {
  // Final fallback: use getAuth() if everything else fails
  console.error('Error initializing Firebase auth, using getAuth() as fallback:', error);
  auth = getAuth(app);
}

export { auth };

// Initialize Firestore
const db = getFirestore(app);

// In dev, connect Firestore to the local emulator to avoid quota limits.
// IMPORTANT: connectFirestoreEmulator must be called BEFORE any Firestore operations
// Use EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST to set the host (e.g., "192.168.1.44:8085" or "localhost:8085")
if (__DEV__ && process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST) {
  const emulatorHost = process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST;
  const [host, port] = emulatorHost.split(":");
  try {
    connectFirestoreEmulator(db, host, Number(port));
    console.log(`✅ Connected to Firestore emulator at ${host}:${port}`);
  } catch (err) {
    if (err.message?.includes('already been initialized') || err.message?.includes('already connected')) {
      console.log(`ℹ️  Firestore emulator already connected at ${host}:${port}`);
    } else {
      console.warn("⚠️  Failed to connect Firestore emulator, continuing with prod DB:", err.message);
      console.warn("Error details:", err);
    }
  }
} else if (__DEV__) {
  console.log("ℹ️  Running in dev mode. To use emulator, set EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST and run: npm run start:emulator");
}

export { db };
export const storage = getStorage(app);

