import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useIous, useIouPayments } from '@/data/hooks';
import { nudgeDates, remaining } from './logic';
import { syncIouReminders } from './reminders';
import { today } from '@/lib/dates';

/** Keeps the phone's IOU reminders in step with the IOUs you made and asked to be reminded about. */
export function useIouReminderSync(signedIn: boolean, me: string | null) {
  const { t, i18n } = useTranslation();
  const ious = useIous(signedIn).data;
  const payments = useIouPayments(signedIn).data;
  useEffect(() => {
    if (!signedIn || !me || !ious || !payments) return;
    const dates = ious
      .filter((i) => i.user_id === me && i.nudge !== 'off' && remaining(i, payments.filter((p) => p.iou_id === i.id)) > 0)
      .flatMap((i) => nudgeDates(i.due_on, today()));
    void syncIouReminders(dates, { title: t('ious.notifTitle'), body: t('ious.notifBody') });
  }, [signedIn, me, ious, payments, t, i18n.language]);
}
