import { useMemo } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState, Group, Money, Row, Screen } from '@/components/ui';
import { useFormatDate } from '@/features/transactions/format';
import { useCommitments, useProfile, useTransactions } from '@/features/transactions/hooks';
import { toISODate } from '@/features/transactions/logic';
import { useFormatHijri, useHijriMonthLabel } from '@/features/giving/format';
import { commitmentStatus } from '@/features/giving/schedule';
import { useColors } from '@/lib/theme';

export default function GivingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useColors();
  const formatDate = useFormatDate();
  const formatHijri = useFormatHijri();
  const hijriMonth = useHijriMonthLabel();
  const { active } = useCommitments();
  const transactions = useTransactions();
  const { privacyMode, hijriAdjustment } = useProfile();
  const today = toISODate(new Date());

  const rows = useMemo(
    () =>
      active
        .filter((c) => c.active)
        .map((commitment) => ({ commitment, status: commitmentStatus(commitment, transactions, today, hijriAdjustment) }))
        .sort((a, b) => (a.status.occurrence?.dueOn ?? '9') < (b.status.occurrence?.dueOn ?? '9') ? -1 : 1),
    [active, transactions, today, hijriAdjustment],
  );

  if (rows.length === 0) {
    return (
      <Screen>
        <EmptyState icon="heart-outline" title={t('giving.emptyTitle')} body={t('giving.emptyBody')} actionLabel={t('giving.add')} onAction={() => router.push('/giving/commitment')} />
      </Screen>
    );
  }

  return (
    <Screen>
      {rows.map(({ commitment: c, status }) => {
        const o = status.occurrence;
        const seasonal = c.schedule === 'ramadan' || c.schedule === 'dhul_hijjah';
        const when = !o
          ? ''
          : seasonal
            ? t('giving.during', { month: hijriMonth(o.start, hijriAdjustment) })
            : status.overdue
              ? t('giving.overdue', { date: formatDate(o.dueOn) })
              : t('giving.due', { date: formatDate(o.dueOn) });
        return (
          <Group key={c.id}>
            <Row label={t(`giving.types.${c.type}`)} right={<Money laari={c.amount_laari} hidden={privacyMode} bold />} />
            <Row label={t(`giving.schedules.${c.schedule}`)} value={when} />
            {o && !seasonal ? <Row label={formatHijri(o.dueOn, hijriAdjustment)} /> : null}
            {c.recipient_note ? <Row label={privacyMode ? t('common.hidden') : c.recipient_note} /> : null}
            {status.done ? (
              <Row label={t('giving.done')} />
            ) : (
              <Row
                label={t('giving.markDone')}
                chevron
                onPress={() => router.push({ pathname: '/transaction', params: { commitmentId: c.id } })}
              />
            )}
            <Row label={t('transactions.editTitle')} chevron onPress={() => router.push({ pathname: '/giving/commitment', params: { id: c.id } })} />
          </Group>
        );
      })}
      <Text style={{ fontSize: 13, color: colors.secondaryText, paddingHorizontal: 16 }}>{t('giving.guidance')}</Text>
    </Screen>
  );
}
