import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingRow } from '@/components/ui';
import { useHousehold } from '@/data/hooks';
import { useAuth } from '@/lib/auth';
import { setFlag, useFlag } from '@/lib/flags';

/**
 * Sharing a debt, pool or monthly gift with the household. In a household it is shared unless you switch it off, and
 * the choice is remembered. An existing item shows what it is now; only its owner can change it.
 * `householdId` is what to save: the household's id, or null for private.
 */
export function useShare(existing?: { household_id?: string | null; user_id?: string } | null) {
  const { t } = useTranslation();
  const household = useHousehold().data;
  const { userId } = useAuth();
  const byDefault = useFlag('shareByDefault') !== false;
  const [pick, setPick] = useState<boolean | null>(null);
  const editing = !!existing;
  const isOwner = !existing || !existing.user_id || existing.user_id === userId;
  const shared = !!household && (pick ?? (editing ? !!existing?.household_id : byDefault));
  const householdId = shared ? household!.household.id : null;
  const row = household && isOwner ? (
    <SettingRow icon="people-outline" title={t('household.shareThis')} subtitle={shared ? t('household.shareOn', { name: household.household.name }) : t('household.shareOff')} value={shared}
      onValueChange={(v) => { setPick(v); void setFlag('shareByDefault', v); }} />
  ) : null;
  return { householdId, row, keep: editing && !isOwner };
}
