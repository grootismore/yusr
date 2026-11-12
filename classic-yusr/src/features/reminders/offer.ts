import { Alert } from 'react-native';
import type { TFunction } from 'i18next';
import Storage from 'expo-sqlite/kv-store';
import { requestReminderPermission } from './notifications';
import { remindersEnabledNow, setRemindersEnabled } from './preference';

const KEY = 'yusr.reminders-offered';
const offered = (): boolean => {
  try {
    return Storage.getItemSync(KEY) === '1';
  } catch {
    return true; // if it cannot be remembered, never ask twice
  }
};

/**
 * Right after someone adds something that has a due date (a bill, a debt payment day, a Sadaqat plan),
 * ask once whether to remind them. The system permission prompt comes only if they say yes.
 * "Not now" is remembered; Settings → Reminders stays available.
 */
export function offerReminders(t: TFunction): void {
  if (remindersEnabledNow() || offered()) return;
  try {
    Storage.setItemSync(KEY, '1');
  } catch {
    // Not remembered; at worst it is asked once more.
  }
  Alert.alert(t('reminders.offerTitle'), t('reminders.offerBody'), [
    { text: t('lock.notNow'), style: 'cancel' },
    {
      text: t('reminders.offerYes'),
      onPress: async () => {
        if (await requestReminderPermission()) setRemindersEnabled(true);
        else Alert.alert(t('settings.remindersOffTitle'), t('settings.remindersOffBody'));
      },
    },
  ]);
}
