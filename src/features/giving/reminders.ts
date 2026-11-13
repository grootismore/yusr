import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { today } from '@/lib/dates';
import { nextHijriOccurrence } from './hijri';
import { reminderDates } from './logic';

// Show a reminder as a banner even while the app is open; no sound or badge.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
  });
}

const IDS = ['kharadhu-zakat-week', 'kharadhu-zakat-day'];

/** Asked only when the person turns the reminder on, never at launch. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  return (await Notifications.requestPermissionsAsync()).status === 'granted';
}

/**
 * Make the scheduled zakat reminders match the settings. Call on launch and after changes: a date
 * trigger fires once, so next year's is scheduled the next time the app opens. The text is generic
 * on purpose (it appears on the lock screen): never an amount or a recipient.
 */
export async function syncZakatReminders(s: { month: number | null; day: number | null; adjustment: number; enabled: boolean }, text: { week: string; day: string; title: string }): Promise<void> {
  if (Platform.OS === 'web') return;
  await Promise.all(IDS.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
  if (!s.enabled || s.month === null || s.day === null) return;
  if ((await Notifications.getPermissionsAsync()).status !== 'granted') return;
  const when = reminderDates(nextHijriOccurrence(s.month, s.day, today(), s.adjustment), new Date());
  const bodies = when.length === 2 ? [text.week, text.day] : [text.day];
  for (let i = 0; i < when.length; i++) {
    await Notifications.scheduleNotificationAsync({
      identifier: when.length === 2 ? IDS[i] : IDS[1],
      content: { title: text.title, body: bodies[i] },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when[i] },
    });
  }
}
