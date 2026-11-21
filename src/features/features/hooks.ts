import { useEffect } from 'react';
import { useCommitments, useDebts, useGiving, useHousehold, useIous, usePools, useRecurring, useRegisterItems, useSplit } from '@/data/hooks';
import { monthStart } from '@/lib/dates';
import { setFlag, useFlag } from '@/lib/flags';
import { FEATURES, featureById, featuresInUse, type FeatureId } from './registry';

/** Is this optional feature switched on? False until switched on, and while the choice is still loading. */
export function useFeature(id: FeatureId): boolean {
  return useFlag(featureById(id).flag) === true;
}

/** Every feature's on/off state at once, for screens that list them. */
export function useFeatureStates(): Record<FeatureId, boolean> {
  const states = {} as Record<FeatureId, boolean>;
  for (const f of FEATURES) states[f.id] = useFlag(f.flag) === true; // eslint-disable-line react-hooks/rules-of-hooks -- the list never changes, so the hooks always run in the same order
  return states;
}

export const setFeature = (id: FeatureId, on: boolean): Promise<void> => setFlag(featureById(id).flag, on);

/**
 * Once, after sign-in: switch on every feature the person already uses, so the simpler app never hides something they have.
 * It waits until everything has loaded, runs once, and leaves later choices alone. With no signal on the first start it
 * simply tries again next time.
 */
export function useFeatureSeed(signedIn: boolean) {
  const seeded = useFlag('featuresSeeded');
  const go = signedIn && seeded === false;
  const debts = useDebts(go), ious = useIous(go), split = useSplit(go), pools = usePools(go), recurring = useRecurring(go);
  const household = useHousehold(go), commitments = useCommitments(go), giving = useGiving(monthStart(), go), register = useRegisterItems(go);
  const ready = [debts, ious, split, pools, recurring, household, commitments, giving, register].every((q) => q.isSuccess);
  useEffect(() => {
    if (!go || !ready) return;
    const on = featuresInUse({
      debts: debts.data?.length ?? 0, ious: ious.data?.length ?? 0, split: split.data?.groups?.length ?? 0, pools: pools.data?.length ?? 0,
      recurring: recurring.data?.length ?? 0, household: !!household.data, giving: (commitments.data?.length ?? 0) + (giving.data?.length ?? 0), register: register.data?.length ?? 0,
    });
    void Promise.all(on.map((id) => setFeature(id, true))).then(() => setFlag('featuresSeeded', true));
  }, [go, ready, debts.data, ious.data, split.data, pools.data, recurring.data, household.data, commitments.data, giving.data, register.data]);
}
