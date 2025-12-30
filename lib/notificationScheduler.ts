import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Schedule notification reminders for calendar events
 */

export interface ReminderSettings {
  enabled: boolean;
  daysBefore: number[]; // e.g., [7, 3, 1] means notify 7 days, 3 days, and 1 day before
  time: string; // e.g., "09:00" for 9 AM
}

/**
 * Schedule reminder notifications for an event
 */
export async function scheduleEventReminders(
  eventId: string,
  eventTitle: string,
  eventDate: Date,
  reminderSettings: ReminderSettings
): Promise<void> {
  if (!reminderSettings.enabled) return;

  try {
    // Request notification permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    // Cancel existing reminders for this event
    await cancelEventReminders(eventId);

    // Schedule reminders for each day before
    for (const daysBefore of reminderSettings.daysBefore) {
      const reminderDate = new Date(eventDate);
      reminderDate.setDate(reminderDate.getDate() - daysBefore);
      const [hours, minutes] = reminderSettings.time.split(':').map(Number);
      reminderDate.setHours(hours, minutes, 0, 0);

      // Only schedule if reminder date is in the future
      if (reminderDate > new Date()) {
        // Format the reminder message based on days before
        let reminderMessage = '';
        if (daysBefore === 30) {
          reminderMessage = `${eventTitle} is in 1 month`;
        } else if (daysBefore === 15) {
          reminderMessage = `${eventTitle} is in 15 days`;
        } else if (daysBefore === 7) {
          reminderMessage = `${eventTitle} is in 1 week`;
        } else if (daysBefore === 2) {
          reminderMessage = `${eventTitle} is in 2 days`;
        } else if (daysBefore === 1) {
          reminderMessage = `${eventTitle} is tomorrow`;
        } else {
          reminderMessage = `${eventTitle} is in ${daysBefore} ${daysBefore === 1 ? 'day' : 'days'}`;
        }

        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `📅 ${eventTitle} coming up!`,
            body: reminderMessage,
            data: { eventId, type: 'calendar-reminder' },
            sound: true,
          },
          trigger: reminderDate,
        });

        // Store notification ID for cancellation later
        await storeNotificationId(eventId, notificationId, daysBefore);
      }
    }

    // Schedule day-of notification
    const dayOfDate = new Date(eventDate);
    const [hours, minutes] = reminderSettings.time.split(':').map(Number);
    dayOfDate.setHours(hours, minutes, 0, 0);

    if (dayOfDate > new Date()) {
      const dayOfNotificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `🎉 ${eventTitle} is today!`,
          body: `Don't forget: ${eventTitle}`,
          data: { eventId, type: 'calendar-event' },
          sound: true,
        },
        trigger: dayOfDate,
      });

      // Store day-of notification ID
      await storeNotificationId(eventId, dayOfNotificationId, 0);
    }
  } catch (error) {
    console.error('Error scheduling reminders:', error);
  }
}

/**
 * Cancel all reminders for an event
 */
export async function cancelEventReminders(eventId: string): Promise<void> {
  try {
    const notificationIds = await getNotificationIds(eventId);
    for (const notificationId of notificationIds) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    }
    await clearNotificationIds(eventId);
  } catch (error) {
    console.error('Error canceling reminders:', error);
  }
}

const NOTIFICATION_IDS_KEY = 'calendar_notification_ids';

/**
 * Store notification ID (using AsyncStorage)
 */
async function storeNotificationId(eventId: string, notificationId: string, daysBefore: number): Promise<void> {
  try {
    const key = `${NOTIFICATION_IDS_KEY}_${eventId}`;
    const existing = await AsyncStorage.getItem(key);
    const ids = existing ? JSON.parse(existing) : [];
    ids.push({ notificationId, daysBefore });
    await AsyncStorage.setItem(key, JSON.stringify(ids));
  } catch (error) {
    console.error('Error storing notification ID:', error);
  }
}

/**
 * Get notification IDs for an event
 */
async function getNotificationIds(eventId: string): Promise<string[]> {
  try {
    const key = `${NOTIFICATION_IDS_KEY}_${eventId}`;
    const existing = await AsyncStorage.getItem(key);
    if (existing) {
      const ids = JSON.parse(existing);
      return ids.map((item: any) => item.notificationId);
    }
    return [];
  } catch (error) {
    console.error('Error getting notification IDs:', error);
    return [];
  }
}

/**
 * Clear notification IDs for an event
 */
async function clearNotificationIds(eventId: string): Promise<void> {
  try {
    const key = `${NOTIFICATION_IDS_KEY}_${eventId}`;
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing notification IDs:', error);
  }
}

/**
 * Default reminder settings
 * Reminders will be sent: 1 month (30 days), 15 days, 7 days, 2 days, and 1 day before the event
 */
export const defaultReminderSettings: ReminderSettings = {
  enabled: true,
  daysBefore: [30, 15, 7, 2, 1],
  time: '09:00',
};

