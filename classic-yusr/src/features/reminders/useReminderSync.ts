import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useCommitments, useDebts, useProfile, useRecurringItems, useTransactions } from '@/features/transactions/hooks';
import { cancelReminders, reminderPermissionGranted, scheduleReminders } from './notifications';
import { useRemindersEnabled } from './preference';
import { buildReminders } from './plan';

/**
 * Keeps scheduled reminders matching the data. Re-plans whenever debts, giving, bills or
 * payments change, when the language changes, and each time the app comes to the foreground
 * (so the 45-day window keeps rolling forward).
 */
export function useReminderSync(): void {
  const { t, i18n } = useTranslation();
  const enabled = useRemindersEnabled();
  const debts = useDebts().active;
  const commitments = useCommitments().active;
  const recurring = useRecurringItems().active;
  const transactions = useTransactions();
  const { hijriAdjustment } = useProfile();
  const [foregrounded, setForegrounded] = useState(0);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setForegrounded((n) => n + 1);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!enabled) return;
      if (!(await reminderPermissionGranted())) return;
      const reminders = buildReminders({ now: new Date(), transactions, debts, commitments, recurring, hijriAdjustment });
      if (cancelled) return;
      await scheduleReminders(reminders, (kind) => ({ title: t('reminders.title'), body: t(`reminders.${kind}`) }));
    })().catch(() => undefined); // reminders are a convenience: never let a scheduling error reach the user
    return () => {
      cancelled = true;
    };
  }, [enabled, transactions, debts, commitments, recurring, hijriAdjustment, foregrounded, i18n.language, t]);

  useEffect(() => {
    if (!enabled) cancelReminders().catch(() => undefined);
  }, [enabled]);
}
