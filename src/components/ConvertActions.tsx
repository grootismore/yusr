import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as api from '@/data/api';
import { useHousehold, useWrite } from '@/data/hooks';
import type { HouseholdEntryInput } from '@/features/household/logic';
import { useAuth } from '@/lib/auth';
import { success } from '@/lib/haptics';
import { toast } from '@/lib/toast';
import { Button } from './ui';

export interface ConvertSource {
  kind: 'expense' | 'income';
  id: string;
  name: string | null;
  amountMinor: number;
  currency: string;
  fxRate: number;
  categoryId: string | null;
  note: string | null;
  /** YYYY-MM-DD */
  date: string;
}

/**
 * What can be done with something already recorded: make it repeat (rent, a bill), or move it into the household's
 * shared pot. Moving copies it to the shared pot and removes it from the person's own records.
 */
export function ConvertActions({ source, canShare, canRepeat, removeOriginal }: { source: ConvertSource; canShare: boolean; canRepeat: boolean; removeOriginal: () => Promise<unknown> }) {
  const { t } = useTranslation();
  const router = useRouter();
  const household = useHousehold().data;
  const { userId } = useAuth();
  const addShared = useWrite(api.addHouseholdEntry);

  async function share() {
    if (!household) return;
    const input: HouseholdEntryInput = { kind: source.kind, amount_laari: source.amountMinor, currency: source.currency, fx_rate_to_mvr: String(source.fxRate), category_id: source.kind === 'expense' ? source.categoryId : null, merchant: source.kind === 'expense' ? source.name : null, note: source.kind === 'income' ? source.name ?? source.note : source.note, entry_date: source.date };
    await addShared.mutateAsync({ householdId: household.household.id, input, userId: userId ?? undefined });
    await removeOriginal();
    success();
    toast(t('edit.movedShared'));
    router.back();
  }

  return (
    <>
      {canRepeat ? (
        <Button kind="secondary" icon="repeat-outline" label={t('edit.repeat')}
          onPress={() => router.push({ pathname: '/recurring-edit', params: { fromKind: source.kind, fromId: source.id, name: source.name ?? '', amount: String(source.amountMinor), currency: source.currency, category: source.categoryId ?? '', date: source.date } })} />
      ) : null}
      {canShare && household ? (
        <Button kind="secondary" icon="people-outline" label={t('edit.moveShared', { name: household.household.name })} loading={addShared.isPending}
          onPress={() => Alert.alert(t('edit.shareTitle'), t('edit.shareBody'), [{ text: t('common.cancel'), style: 'cancel' }, { text: t('edit.moveShared', { name: household.household.name }), onPress: () => void share() }])} />
      ) : null}
    </>
  );
}
