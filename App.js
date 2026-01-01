import "./global.css";
import React, { useEffect, useState, useRef } from "react";
import { View, Text, ActivityIndicator, Alert } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MainTabNavigator } from "./navigation/MainTabNavigator";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import * as Linking from "expo-linking";

import { auth, db } from "./lib/firebase";
import { colors } from "./theme/designSystem";
import { LandingScreen } from "./screens/LandingScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { SignUpScreen } from "./screens/SignUpScreen";
import { ProfileSetupScreen } from "./screens/ProfileSetupScreen";
import { PairingScreen } from "./screens/PairingScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { MessagesScreen } from "./screens/MessagesScreen";
import { ChatScreen } from "./screens/ChatScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { SettingsPage } from "./screens/SettingsPage";
import { ProfileScreen } from "./screens/ProfileScreen";
import { LocationScreen } from "./screens/LocationScreen";
import { DrawingScreen } from "./screens/DrawingScreen";
import { CalendarScreen } from "./screens/CalendarScreen";
import { startLockScreenUpdates } from "./lib/lockScreenService";
import { startDistanceWidgetService, stopDistanceWidgetService, writeWidgetData } from "./lib/widgetDataService";
// import { startAllWidgets } from "./lib/widgetService"; // Disabled widgets for now

const Stack = createNativeStackNavigator();

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [isPaired, setIsPaired] = useState(false);
  const [error, setError] = useState(null);
  const widgetsInitialized = React.useRef(false);
  const lockScreenInitialized = React.useRef(false);
  const distanceWidgetCleanup = React.useRef(null);
  const distanceWidgetStarting = React.useRef(false); // Prevent concurrent starts
  const lastWidgetState = React.useRef({ enabled: false, coupleId: null, profileComplete: false }); // Track last state to prevent unnecessary restarts
  const navigationRef = React.useRef(null);
  const deepLinkCodeRef = React.useRef(null);

  // Catch any initialization errors
  useEffect(() => {
    try {
      // Verify Firebase is initialized
      if (!auth) {
        throw new Error("Firebase auth is not initialized");
      }
    } catch (e) {
      console.error("Firebase initialization error:", e);
      setError(e.message || "Failed to initialize Firebase");
      setInitializing(false);
    }
  }, []);

  useEffect(() => {
    let userUnsubscribe = null;

    try {
      const unsubscribe = onAuthStateChanged(
        auth,
        async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setHasProfile(false);
        setInitializing(false);
        widgetsInitialized.current = false; // Reset widgets flag
        lockScreenInitialized.current = false; // Reset lock screen flag
        // Clean up distance widget service
        if (distanceWidgetCleanup.current) {
          distanceWidgetCleanup.current();
          distanceWidgetCleanup.current = null;
        }
        stopDistanceWidgetService().catch(err => {
          console.error("Failed to stop distance widget service:", err);
        });
        // Clean up user listener if exists
        if (userUnsubscribe) {
          userUnsubscribe();
          userUnsubscribe = null;
        }
        return;
      }

      setUser(firebaseUser);
      setInitializing(true);

      try {
        const userRef = doc(db, "users", firebaseUser.uid);
        
        // Use onSnapshot directly - it provides initial data and real-time updates
        // This is faster than getDoc + onSnapshot (one read instead of two)
        userUnsubscribe = onSnapshot(userRef, (snap) => {
          const data = snap.data() || {};
          
          // Check if profile is complete (name and either dateOfBirth or anniversaryDate are required)
          // Support both new (dateOfBirth) and old (anniversaryDate) field names for backward compatibility
          const profileComplete = Boolean(
            data.name && (data.dateOfBirth || data.anniversaryDate)
          );
          
          // Check if user is paired with their partner
          const paired = Boolean(data.coupleId);
          
          setHasProfile(profileComplete);
          setIsPaired(paired);
          
          // Start lock screen updates if enabled (only once, and only if coupleId exists)
          if (profileComplete && data.settings?.showDrawingOnLockScreen && data.coupleId && !lockScreenInitialized.current) {
            lockScreenInitialized.current = true;
            startLockScreenUpdates().catch(err => {
              console.error("Failed to start lock screen updates:", err);
              lockScreenInitialized.current = false; // Reset on error so it can retry
            });
          } else if (!data.settings?.showDrawingOnLockScreen || !data.coupleId) {
            // Reset flag if setting is disabled or coupleId is removed
            lockScreenInitialized.current = false;
          }

          // Always write initial widget data (even when not connected) so widget can be added to home screen
          writeWidgetData({
            distance: 0,
            formatted: data.coupleId ? 'Not connected' : 'Not Connected',
            direction: null,
            lastUpdate: Date.now(),
            partnerName: 'Partner',
            isConnected: Boolean(data.coupleId),
          }).catch(err => {
            console.error('Error writing initial widget data:', err);
          });

          // Start distance widget service if enabled
          const isDistanceWidgetEnabled = data.settings?.showDistanceWidget ?? false;
          const shouldStartWidget = profileComplete && isDistanceWidgetEnabled && data.coupleId;
          const currentState = { 
            enabled: isDistanceWidgetEnabled, 
            coupleId: data.coupleId,
            profileComplete: profileComplete 
          };
          
          // Only process if state actually changed (prevents repeated calls on every snapshot)
          const stateChanged = 
            lastWidgetState.current.enabled !== currentState.enabled ||
            lastWidgetState.current.coupleId !== currentState.coupleId ||
            lastWidgetState.current.profileComplete !== currentState.profileComplete;
          
          // If state hasn't changed and service is already running, skip entirely
          if (!stateChanged && distanceWidgetCleanup.current) {
            // State hasn't changed and service is running - do nothing
            return; // Early return - no need to process
          }
          
          // Update last state
          lastWidgetState.current = currentState;
          
          if (shouldStartWidget) {
            // Only start if not already running and not currently starting
            if (!distanceWidgetCleanup.current && !distanceWidgetStarting.current) {
              distanceWidgetStarting.current = true;
              console.log('Starting distance widget service from App.js');
              // Start new service
              startDistanceWidgetService().then((cleanup) => {
                distanceWidgetStarting.current = false;
                if (cleanup && typeof cleanup === 'function') {
                  distanceWidgetCleanup.current = cleanup;
                  console.log('Distance widget service cleanup function set');
                } else {
                  console.warn('Distance widget service did not return a cleanup function');
                }
              }).catch(err => {
                distanceWidgetStarting.current = false;
                console.error("Failed to start distance widget service:", err);
              });
            } else if (distanceWidgetStarting.current) {
              // Service is starting, do nothing
            } else if (distanceWidgetCleanup.current) {
              // Service is already running, do nothing
            }
          } else {
            // Stop service if disabled or not connected
            if (distanceWidgetCleanup.current) {
              console.log('Stopping distance widget service (disabled or not connected)');
              try {
                distanceWidgetCleanup.current();
              } catch (e) {
                console.error('Error calling cleanup function:', e);
              }
              distanceWidgetCleanup.current = null;
            }
            distanceWidgetStarting.current = false; // Reset starting flag
            stopDistanceWidgetService().catch(err => {
              console.error("Failed to stop distance widget service:", err);
            });
          }

          // Start widgets only once when profile becomes complete
          // DISABLED: Other widgets are disabled for now
          // if (profileComplete && !widgetsInitialized.current) {
          //   widgetsInitialized.current = true;
          //   startAllWidgets().catch(err => {
          //     console.error("Failed to start widgets:", err);
          //   });
          // }
        }, (error) => {
          console.error("Error in user snapshot:", error);
          setHasProfile(false);
          setIsPaired(false);
          setInitializing(false);
        });
      } catch (e) {
            console.error("Error loading user profile:", e);
        setHasProfile(false);
            setIsPaired(false);
      } finally {
        setInitializing(false);
      }
        },
        (error) => {
          console.error("Auth state change error:", error);
          setError(error.message);
          setInitializing(false);
        }
      );
    
    return () => {
      unsubscribe();
      if (userUnsubscribe) {
        userUnsubscribe();
      }
      // Clean up distance widget service
      if (distanceWidgetCleanup.current) {
        distanceWidgetCleanup.current();
        distanceWidgetCleanup.current = null;
      }
      distanceWidgetStarting.current = false; // Reset starting flag
      stopDistanceWidgetService().catch(err => {
        console.error("Failed to stop distance widget service:", err);
      });
    };
    } catch (e) {
      console.error("Error setting up auth listener:", e);
      setError(e.message);
      setInitializing(false);
    }
  }, []);

  // Handle deep linking
  useEffect(() => {
    // Handle initial URL (when app is opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    }).catch(err => console.error("Error getting initial URL:", err));

    // Handle URL when app is already open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, [user, hasProfile]);


  if (error) {
    return (
      <View className="flex-1 justify-center items-center px-6" style={{ backgroundColor: colors.primary.warmWhite }}>
        <Text className="text-xl font-bold mb-2" style={{ color: colors.primary.deepRose }}>Error</Text>
        <Text className="text-base text-center mb-4" style={{ color: colors.secondary.charcoalGray }}>{error}</Text>
        <Text className="text-sm text-center" style={{ color: colors.status.offline }}>
          Please check your console for more details.
        </Text>
      </View>
    );
  }

  if (initializing) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: colors.primary.warmWhite }}>
        <ActivityIndicator size="large" color={colors.primary.softRose} />
        <Text className="mt-4 text-base" style={{ color: colors.secondary.charcoalGray }}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
    <NavigationContainer 
      ref={navigationRef}
      linking={{
        prefixes: ['lovelly://', 'https://lovelly.app'],
        config: {
          screens: {
            MainTabs: {
              screens: {
                Pairing: {
                  path: 'join/:code',
                  parse: {
                    code: (code) => code,
                  },
                },
              },
            },
            Pairing: {
              path: 'join/:code',
              parse: {
                code: (code) => code,
              },
            },
          },
        },
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // Step 1: User not logged in → Show Landing screen first
          <>
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        ) : !hasProfile ? (
          // Step 2: User logged in but profile incomplete → Show ProfileSetup
          <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        ) : (
          // Step 3: Profile complete → Show Tab Navigator with nested Stack for detail screens
          <>
            <Stack.Screen 
              name="MainTabs" 
              component={MainTabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Chat" 
              component={ChatScreen}
              options={{ headerShown: false, presentation: 'card' }}
            />
            <Stack.Screen 
              name="Location" 
              component={LocationScreen}
              options={{ headerShown: false, presentation: 'card' }}
            />
            <Stack.Screen 
              name="Drawing" 
              component={DrawingScreen}
              options={{ headerShown: false, presentation: 'card' }}
            />
            <Stack.Screen 
              name="Calendar" 
              component={CalendarScreen}
              options={{ headerShown: false, presentation: 'card' }}
            />
            <Stack.Screen 
              name="Pairing" 
              component={PairingScreen}
              options={{ headerShown: false, presentation: 'card' }}
            />
            <Stack.Screen 
              name="Profile" 
              component={ProfileScreen}
              options={{ headerShown: false, presentation: 'card' }}
            />
            <Stack.Screen 
              name="SettingsPage" 
              component={SettingsPage}
              options={{ headerShown: false, presentation: 'card' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
    </SafeAreaProvider>
  );
}