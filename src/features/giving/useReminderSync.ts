import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useZakat } from '@/data/hooks';
import { syncZakatReminders } from './reminders';

/** Keeps the scheduled zakat reminders in step with the settings. Runs on launch and whenever they change. */
export function useZakatReminderSync(signedIn: boolean) {
  const { t, i18n } = useTranslation();
  const { data } = useZakat(signedIn);
  useEffect(() => {
    if (!signedIn || !data) return;
    void syncZakatReminders(
      { month: data.zakat_hijri_month, day: data.zakat_hijri_day, adjustment: data.hijri_adjustment, enabled: data.zakat_reminder },
      { title: t('zakat.notifTitle'), week: t('zakat.notifWeek'), day: t('zakat.notifDay') },
    );
  }, [signedIn, data, t, i18n.language]);
}
