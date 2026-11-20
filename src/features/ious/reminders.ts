import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const PREFIX = 'kharadhu-iou-';
/** iOS keeps at most 64 scheduled reminders; leave room for the zakat ones. */
const MAX = 50;

/**
 * Make the phone's scheduled IOU reminders match the open IOUs that asked for them. Call on launch and after changes: it
 * clears its own reminders and schedules the next ones. The text is generic on purpose (it shows on the lock screen):
 * never a name or an amount. Permission is asked only when someone chooses a reminder, never here.
 */
export async function syncIouReminders(dates: string[], text: { title: string; body: string }): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(scheduled.filter((n) => n.identifier.startsWith(PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
    if (!dates.length || (await Notifications.getPermissionsAsync()).status !== 'granted') return;
    const now = Date.now();
    const when = [...new Set(dates)].sort().map((d) => new Date(`${d}T09:00:00`)).filter((d) => d.getTime() > now).slice(0, MAX);
    for (const date of when) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${PREFIX}${date.toISOString().slice(0, 10)}`,
        content: { title: text.title, body: text.body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
      });
    }
  } catch { /* a reminder that cannot be scheduled is never worth a crash */ }
}
