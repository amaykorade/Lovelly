/**
 * Widget Data Service
 * 
 * This service calculates distance and writes data to shared storage
 * that native widgets can read. Works for both iOS and Android.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { calculateDistance, formatDistance, getDistanceDirection } from './widgetUtils';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// iOS App Group identifier (configured in Xcode)
const IOS_APP_GROUP = 'group.com.lovelly.app';
// Android SharedPreferences key
const ANDROID_PREFS_KEY = 'lovelly_widget_data';

// Check if running in Expo Go (native modules won't be available)
const isExpoGo = Constants.executionEnvironment === 'storeClient';
let hasWarnedAboutNativeModule = false; // Track if we've already warned

export interface WidgetData {
  distance: number;              // Distance in km
  formatted: string;             // "2.5 km" or "150 m"
  direction: 'closer' | 'farther' | 'same' | null;
  lastUpdate: number;             // Timestamp
  partnerName: string;
  isConnected: boolean;
}

let locationListeners: (() => void)[] = [];
let userListener: (() => void) | null = null;
let lastDistance: number | null = null;
let lastUpdateTime: number = 0;
let isStarting = false; // Prevent concurrent starts
const UPDATE_THROTTLE_MS = 30000; // Update every 30 seconds

/**
 * Write widget data to shared storage
 */
async function writeWidgetData(data: WidgetData): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      // iOS: Write to App Group using native module
      try {
        const { NativeModules } = require('react-native');
        const AppGroupBridge = NativeModules.AppGroupBridge;
        if (AppGroupBridge) {
          await AppGroupBridge.writeToAppGroup(
            IOS_APP_GROUP,
            'widgetData',
            JSON.stringify(data)
          );
        } else {
          throw new Error('AppGroupBridge module not found');
        }
      } catch (error) {
        // Fallback: If native module not available, use AsyncStorage as temporary storage
        // Widget will read from AsyncStorage until native module is set up
        // Only warn if not in Expo Go (where native modules are expected to be unavailable)
        if (!isExpoGo && !hasWarnedAboutNativeModule) {
          console.warn('AppGroupBridge not available, using AsyncStorage fallback:', error);
          hasWarnedAboutNativeModule = true;
        }
        await AsyncStorage.setItem('ios_widget_data', JSON.stringify(data));
      }
    } else {
      // Android: Write to SharedPreferences directly (for widget access)
      // AsyncStorage uses a different storage, so we write to SharedPreferences via native bridge
      try {
        const { NativeModules } = require('react-native');
        const WidgetUpdateBridge = NativeModules.WidgetUpdateBridge;
        if (WidgetUpdateBridge && WidgetUpdateBridge.writeWidgetData) {
          // Use native bridge to write directly to SharedPreferences
          await WidgetUpdateBridge.writeWidgetData(JSON.stringify(data));
        } else {
          // Fallback: Use AsyncStorage (widget won't be able to read this, but data is stored)
          await AsyncStorage.setItem(ANDROID_PREFS_KEY, JSON.stringify(data));
          // Only warn once, and only if not in Expo Go (where it's expected)
          if (!isExpoGo && !hasWarnedAboutNativeModule) {
            console.warn('WidgetUpdateBridge.writeWidgetData not available, using AsyncStorage fallback');
            hasWarnedAboutNativeModule = true;
          }
        }
        
        // Trigger widget update via broadcast
        if (WidgetUpdateBridge && WidgetUpdateBridge.updateWidget) {
          WidgetUpdateBridge.updateWidget();
        }
      } catch (error) {
        // Only warn if not in Expo Go (where native modules are expected to be unavailable)
        if (!isExpoGo) {
          console.warn('Error writing widget data to SharedPreferences:', error);
        }
        // Fallback to AsyncStorage
        await AsyncStorage.setItem(ANDROID_PREFS_KEY, JSON.stringify(data));
      }
    }
    
    console.log('Widget data updated:', data);
  } catch (error) {
    console.error('Error writing widget data:', error);
  }
}

/**
 * Trigger widget update via push notification (iOS) or broadcast (Android)
 */
async function triggerWidgetUpdate(data: WidgetData): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      // iOS: Send silent push notification to trigger widget refresh
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '', // Empty = silent notification
          body: '',
          data: {
            type: 'widget-update',
            distance: data.distance,
            formatted: data.formatted,
            direction: data.direction,
          },
          sound: false,
        },
        trigger: null, // Immediate
        identifier: 'widget-update-trigger',
      });
    } else {
      // Android: Send broadcast intent (handled by native bridge)
      try {
        const { WidgetUpdateBridge } = require('./native/WidgetUpdateBridge');
        await WidgetUpdateBridge.sendWidgetUpdate();
      } catch (error) {
        console.warn('WidgetUpdateBridge not available:', error);
      }
    }
  } catch (error) {
    console.error('Error triggering widget update:', error);
  }
}

/**
 * Start distance widget service
 */
export async function startDistanceWidgetService() {
  // Prevent concurrent starts
  if (isStarting) {
    console.log('Distance widget service is already starting, skipping...');
    return null;
  }

  if (userListener) {
    console.log('Distance widget service already running, skipping...');
    return () => {
      if (userListener) {
        userListener();
        userListener = null;
      }
      locationListeners.forEach(unsub => unsub());
      locationListeners = [];
    };
  }

  isStarting = true;
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log('No user, cannot start distance widget service');
      isStarting = false;
      return null; // Return null explicitly
    }

    // Listen to user document for coupleId and settings
    const userRef = doc(db, 'users', user.uid);
    
    let myLocation: { latitude: number; longitude: number } | null = null;
    let partnerLocation: { latitude: number; longitude: number } | null = null;
    let partnerName = 'Partner';
    let currentPartnerId: string | null = null;

    const updateWidget = async () => {
      // Log first to see when it's called, even if throttled
      console.log('updateWidget called:', {
        hasMyLocation: !!myLocation,
        hasPartnerLocation: !!partnerLocation,
        partnerName,
        isConnected: currentPartnerId !== null,
        timeSinceLastUpdate: lastUpdateTime > 0 ? Date.now() - lastUpdateTime : 'first update',
      });

      const now = Date.now();
      if (now - lastUpdateTime < UPDATE_THROTTLE_MS && lastDistance !== null) {
        console.log('Widget update throttled (waiting 30s between updates)');
        return; // Throttle updates
      }

      if (!myLocation || !partnerLocation) {
        // No location data - write empty state
        const reason = !myLocation && !partnerLocation 
          ? 'No locations available' 
          : !myLocation 
          ? 'My location not available' 
          : 'Partner location not available';
        console.log(`Writing widget data: ${reason}`);
        await writeWidgetData({
          distance: 0,
          formatted: 'Not available',
          direction: null,
          lastUpdate: Date.now(),
          partnerName: partnerName,
          isConnected: currentPartnerId !== null,
        });
        return;
      }

      // Calculate distance
      const distance = calculateDistance(
        myLocation.latitude,
        myLocation.longitude,
        partnerLocation.latitude,
        partnerLocation.longitude
      );

      const direction = getDistanceDirection(distance, lastDistance);
      const formatted = formatDistance(distance);

      console.log('Calculated distance:', {
        distance,
        formatted,
        direction,
        lastDistance,
      });

      const widgetData: WidgetData = {
        distance,
        formatted,
        direction,
        lastUpdate: Date.now(),
        partnerName,
        isConnected: true,
      };

      // Write to shared storage
      await writeWidgetData(widgetData);

      // Trigger widget update if distance changed significantly
      if (lastDistance === null || Math.abs(distance - lastDistance) > 0.1) {
        await triggerWidgetUpdate(widgetData);
        lastDistance = distance;
        lastUpdateTime = now;
      } else {
        console.log('Distance change too small, skipping widget update');
      }
    };

    // Listen to user settings and couple data
    userListener = onSnapshot(userRef, async (userSnap) => {
      const userData = userSnap.data();
      const isEnabled = userData?.settings?.showDistanceWidget ?? false;

      console.log('User snapshot received:', {
        isEnabled,
        hasCoupleId: !!userData?.coupleId,
        hasLocation: !!(userData?.location?.latitude && userData?.location?.longitude),
      });

      if (!isEnabled) {
        // Widget disabled - clear listeners and write disabled state
        console.log('Widget disabled in settings');
        locationListeners.forEach(unsub => unsub());
        locationListeners = [];
        myLocation = null;
        partnerLocation = null;
        
        await writeWidgetData({
          distance: 0,
          formatted: 'Disabled',
          direction: null,
          lastUpdate: Date.now(),
          partnerName: 'Partner',
          isConnected: false,
        });
        return;
      }

      const coupleId = userData?.coupleId;
      if (!coupleId) {
        // Not connected - clear listeners and write not connected state
        console.log('No coupleId - not paired');
        locationListeners.forEach(unsub => unsub());
        locationListeners = [];
        myLocation = null;
        partnerLocation = null;
        currentPartnerId = null;
        
        await writeWidgetData({
          distance: 0,
          formatted: 'Not connected',
          direction: null,
          lastUpdate: Date.now(),
          partnerName: 'Partner',
          isConnected: false,
        });
        return;
      }

      // Get partner info
      try {
        const coupleRef = doc(db, 'couples', coupleId);
        const coupleSnap = await getDoc(coupleRef);
        const coupleData = coupleSnap.data();
        const newPartnerId = coupleData?.ownerId === user.uid 
          ? coupleData?.partnerId 
          : coupleData?.ownerId;

        if (!newPartnerId) {
          locationListeners.forEach(unsub => unsub());
          locationListeners = [];
          currentPartnerId = null;
          return;
        }

        // Get partner name
        const partnerRef = doc(db, 'users', newPartnerId);
        const partnerSnap = await getDoc(partnerRef);
        const partnerData = partnerSnap.data();
        partnerName = partnerData?.name || 'Partner';

        // Only set up listeners if partner changed
        if (newPartnerId !== currentPartnerId) {
          currentPartnerId = newPartnerId;
          
          // Clean up old listeners
          locationListeners.forEach(unsub => unsub());
          locationListeners = [];

          // Listen to my location
          const myLocationUnsub = onSnapshot(
            doc(db, 'users', user.uid),
            (snap) => {
              const data = snap.data();
              if (data?.location?.latitude && data?.location?.longitude) {
                myLocation = {
                  latitude: data.location.latitude,
                  longitude: data.location.longitude,
                };
                console.log('My location updated:', myLocation);
                updateWidget();
              } else {
                console.log('My location not available in user document');
                myLocation = null;
                updateWidget();
              }
            },
            (error) => {
              console.error('Error in my location listener:', error);
            }
          );

          // Listen to partner location
          const partnerLocationUnsub = onSnapshot(
            doc(db, 'users', newPartnerId),
            (snap) => {
              const data = snap.data();
              // Check if partner allows location sharing
              const allowsSharing = data?.settings?.shareLocationWithPartner !== false;
              
              console.log('Partner location snapshot:', {
                allowsSharing,
                hasLocation: !!(data?.location?.latitude && data?.location?.longitude),
                partnerId: newPartnerId,
              });
              
              if (allowsSharing && data?.location?.latitude && data?.location?.longitude) {
                partnerLocation = {
                  latitude: data.location.latitude,
                  longitude: data.location.longitude,
                };
                console.log('Partner location updated:', partnerLocation);
                updateWidget();
              } else {
                console.log('Partner location not available:', {
                  allowsSharing,
                  hasLocation: !!(data?.location?.latitude && data?.location?.longitude),
                });
                partnerLocation = null;
                updateWidget();
              }
            },
            (error) => {
              console.error('Error in partner location listener:', error);
            }
          );

          locationListeners = [myLocationUnsub, partnerLocationUnsub];
        }
      } catch (error) {
        console.error('Error setting up partner listeners:', error);
      }
    }, (error) => {
      console.error('Error in user snapshot for distance widget:', error);
    });

    console.log('Distance widget service started');
    isStarting = false; // Reset starting flag

    // Return cleanup function
    return () => {
      if (userListener) {
        userListener();
        userListener = null;
      }
      locationListeners.forEach(unsub => unsub());
      locationListeners = [];
      myLocation = null;
      partnerLocation = null;
      lastDistance = null;
      isStarting = false; // Reset starting flag on cleanup
    };
  } catch (error) {
    console.error('Error starting distance widget service:', error);
    isStarting = false; // Reset starting flag on error
    return () => {}; // Return empty cleanup function
  }
}

/**
 * Stop distance widget service
 */
export async function stopDistanceWidgetService() {
  try {
    isStarting = false; // Reset starting flag
    if (userListener) {
      userListener();
      userListener = null;
    }
    
    locationListeners.forEach(unsub => unsub());
    locationListeners = [];
    
    // Clear widget data
    if (Platform.OS === 'android') {
      await AsyncStorage.removeItem(ANDROID_PREFS_KEY);
    } else {
      try {
        const { NativeModules } = require('react-native');
        const AppGroupBridge = NativeModules.AppGroupBridge;
        if (AppGroupBridge) {
          await AppGroupBridge.writeToAppGroup(IOS_APP_GROUP, 'widgetData', '{}');
        }
      } catch (error) {
        await AsyncStorage.removeItem('ios_widget_data');
      }
    }

    // Cancel widget update notifications
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const widgetNotifications = allNotifications.filter(
      (n) => n.content.data?.type === 'widget-update'
    );
    for (const notif of widgetNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }

    lastDistance = null;
    lastUpdateTime = 0;
    console.log('Distance widget service stopped');
  } catch (error) {
    console.error('Error stopping distance widget service:', error);
  }
}

