import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { renderDrawingToImage, Stroke } from './drawingToImage';

let lockScreenListener: (() => void) | null = null;
let isEnabled = false;
let partnerId: string | null = null;
let lastStrokeCount = 0;
let lastUpdateTime = 0;
let lastNotificationTime = 0;

/**
 * Configure notification handler
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Update lock screen with drawing image using notifications
 * Uses rich notifications that appear on lock screen
 */
async function updateLockScreenDrawing(imageUri: string, strokeCount: number) {
  try {
    // Use a single persistent notification identifier
    const NOTIFICATION_ID = 'drawing-update-partner';
    
    // Cancel previous drawing notifications to avoid clutter
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const drawingNotifications = allNotifications.filter(n => 
      n.content.data?.type === 'drawing' && n.identifier !== NOTIFICATION_ID
    );
    for (const notif of drawingNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
    
    // For iOS - Rich notification with image attachment
    if (Platform.OS === 'ios') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💕 Drawing from Partner',
          body: 'Your partner is drawing...',
          data: { imageUri, type: 'drawing', strokeCount },
          sound: false,
          badge: 1,
          categoryIdentifier: 'DRAWING_UPDATE',
        },
        trigger: null, // Show immediately
        identifier: NOTIFICATION_ID, // Use same ID to update existing notification
      });
    }
    
    // For Android - Rich notification (shows on lock screen)
    if (Platform.OS === 'android') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💕 Drawing from Partner',
          body: 'Your partner is drawing...',
          data: { imageUri, type: 'drawing', strokeCount },
          sound: false,
          android: {
            channelId: 'drawing-updates',
            priority: Notifications.AndroidNotificationPriority.HIGH,
            visibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            ongoing: true, // Makes it persistent/ongoing
          },
        },
        trigger: null,
        identifier: NOTIFICATION_ID, // Use same ID to update existing notification
      });
    }
  } catch (err) {
    console.error('Lock screen update error:', err);
  }
}

/**
 * Start listening for partner's drawing updates
 */
export async function startLockScreenUpdates() {
  if (lockScreenListener) {
    return; // Already listening
  }

  try {
    // Request notification permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Notification permission not granted for lock screen');
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    // Check if feature is enabled in user settings
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data();
    isEnabled = userData?.settings?.showDrawingOnLockScreen ?? false;

    if (!isEnabled) {
      console.log('Lock screen drawing is disabled in settings');
      return;
    }

    const coupleId = userData?.coupleId;
    if (!coupleId) {
      console.log('No couple ID found');
      return;
    }

    // Get partner ID
    const coupleRef = doc(db, 'couples', coupleId);
    const coupleSnap = await getDoc(coupleRef);
    const coupleData = coupleSnap.data();
    partnerId = coupleData?.ownerId === user.uid 
      ? coupleData?.partnerId 
      : coupleData?.ownerId;

    if (!partnerId) {
      console.log('No partner ID found');
      return;
    }

    // Listen to canvas updates
    const canvasRef = doc(db, 'couples', coupleId, 'realtime', 'canvas');
    // Reset tracking variables when starting new listener
    lastStrokeCount = 0;
    lastUpdateTime = 0;
    lastNotificationTime = 0;
    const THROTTLE_MS = 5000; // Update lock screen max once every 5 seconds

    lockScreenListener = onSnapshot(canvasRef, async (canvasSnap) => {
      // Check if still enabled
      const currentUserSnap = await getDoc(userRef);
      const currentUserData = currentUserSnap.data();
      const stillEnabled = currentUserData?.settings?.showDrawingOnLockScreen ?? false;
      
      if (!stillEnabled) {
        isEnabled = false;
        if (lockScreenListener) {
          lockScreenListener();
          lockScreenListener = null;
        }
        return;
      }

      const data = canvasSnap.data();
      if (!data?.strokes || data.strokes.length === 0) return;

      // Only show if partner is actively drawing (not current user)
      const activeOwner = data.activeStrokeOwner;
      
      // Don't show if:
      // 1. activeOwner is null/undefined (no one is currently drawing)
      // 2. activeOwner is the current user (you're drawing, not your partner)
      if (!activeOwner || activeOwner === user.uid) {
        return; // Don't show own drawings or when no one is actively drawing
      }

      // Verify that activeOwner is actually the partner
      // (safety check - should already be verified above, but double-check)
      if (activeOwner !== partnerId) {
        console.warn('Lock screen: activeOwner does not match partnerId');
        return;
      }

      // Only update if strokes changed significantly
      const currentStrokeCount = data.strokes.length;
      if (currentStrokeCount === lastStrokeCount) {
        return; // No change in stroke count
      }

      // Throttle notifications - only send max once every THROTTLE_MS
      const now = Date.now();
      if (now - lastNotificationTime < THROTTLE_MS) {
        // Still update the stroke count to track changes, but don't send notification yet
        lastStrokeCount = currentStrokeCount;
        return;
      }

      // Only send notification if there's been a meaningful change
      // (at least 1 new stroke since last notification)
      const strokeDifference = currentStrokeCount - lastStrokeCount;
      if (strokeDifference < 1) {
        return;
      }

      // Update tracking variables
      lastStrokeCount = currentStrokeCount;
      lastUpdateTime = now;
      lastNotificationTime = now;

      try {
        // Convert drawing to image
        const imageUri = await renderDrawingToImage(data.strokes);
        if (imageUri) {
          await updateLockScreenDrawing(imageUri, currentStrokeCount);
        }
      } catch (err) {
        console.error('Error updating lock screen:', err);
      }
    }, (error) => {
      console.error('Error in lock screen listener:', error);
    });

    console.log('Lock screen updates started');
  } catch (err) {
    console.error('Failed to start lock screen updates:', err);
  }
}

/**
 * Stop lock screen updates
 */
export async function stopLockScreenUpdates() {
  try {
    if (lockScreenListener) {
      lockScreenListener();
      lockScreenListener = null;
    }
    // Reset tracking variables
    lastStrokeCount = 0;
    lastUpdateTime = 0;
    lastNotificationTime = 0;
    partnerId = null;
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('Lock screen updates stopped');
  } catch (err) {
    console.error('Failed to stop lock screen updates:', err);
  }
}

/**
 * Restart lock screen updates (call when setting changes)
 */
export async function restartLockScreenUpdates() {
  await stopLockScreenUpdates();
  await startLockScreenUpdates();
}
