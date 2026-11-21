import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ListRow } from '@/components/ui';
import { useHousehold, useHouseholdEntries } from '@/data/hooks';
import { monthStart } from '@/lib/dates';
import { useMoneyText } from '@/lib/privacy';
import { summarize } from './logic';

/** The shared pot as one row of Home's "at a glance" list: its name and what was spent together this month. Nothing shows without a household. */
export function HouseholdGlanceRow({ month = monthStart(), last }: { month?: string; last?: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const text = useMoneyText();
  const data = useHousehold().data;
  const entries = useHouseholdEntries(month).data;
  const summary = useMemo(() => summarize(entries ?? [], data?.members ?? []), [entries, data]);
  if (!data) return null;
  const couple = data.household.mode === 'couple';
  return <ListRow icon={couple ? 'heart-outline' : 'people-outline'} title={data.household.name} subtitle={`${t('household.spent')} ${text(summary.spent)}`} onPress={() => router.push('/household')} last={last} />;
}
