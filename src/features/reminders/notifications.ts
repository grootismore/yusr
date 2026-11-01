import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import type { Reminder, ReminderKind } from './plan';

// Show a reminder as a banner even while the app is open; no sound or badge.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const CHANNEL = 'reminders';

export async function reminderPermissionGranted(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).status === 'granted';
}

/** Asked only when the user turns reminders on, never at launch. */
export async function requestReminderPermission(): Promise<boolean> {
  if (await reminderPermissionGranted()) return true;
  return (await Notifications.requestPermissionsAsync()).status === 'granted';
}

export async function cancelReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Replace every scheduled reminder with `reminders`. The text is generic on purpose: it
 * appears on the lock screen, so it never carries an amount, lender or recipient.
 */
export async function scheduleReminders(
  reminders: readonly Reminder[],
  text: (kind: ReminderKind) => { title: string; body: string },
): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Reminders',
      importance: AndroidImportance.DEFAULT,
    });
  }
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const reminder of reminders) {
    const { title, body } = text(reminder.kind);
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.key,
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.fireAt, channelId: CHANNEL },
    });
  }
}
