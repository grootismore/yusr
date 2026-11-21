import type { IconName } from '@/components/ui';
import type { FlagName } from '@/lib/flags';

export type FeatureId = 'recurring' | 'debts' | 'giving' | 'pools' | 'rule' | 'household' | 'split' | 'ious' | 'register';
export type FeatureGroup = 'money' | 'people' | 'safety';

export interface FeatureDef {
  id: FeatureId;
  /** The remembered on/off choice. */
  flag: FlagName;
  group: FeatureGroup;
  icon: IconName;
  route: string;
  /** The title the screen itself already uses (an existing translation key). */
  title: string;
}

/** Everything beyond the basics (adding entries, scanning, budgets, reports) that a person can switch on. */
export const FEATURES: readonly FeatureDef[] = [
  { id: 'recurring', flag: 'featRecurring', group: 'money', icon: 'repeat', route: '/recurring', title: 'recurring.title' },
  { id: 'debts', flag: 'featDebts', group: 'money', icon: 'leaf-outline', route: '/debts', title: 'more.debts' },
  { id: 'giving', flag: 'featGiving', group: 'money', icon: 'heart-outline', route: '/giving', title: 'more.giving' },
  { id: 'pools', flag: 'featPools', group: 'money', icon: 'cash-outline', route: '/pools', title: 'pools.title' },
  { id: 'rule', flag: 'rule503020', group: 'money', icon: 'pie-chart-outline', route: '/rule', title: 'rule.title' },
  { id: 'household', flag: 'featHousehold', group: 'people', icon: 'people-circle-outline', route: '/household', title: 'household.title' },
  { id: 'split', flag: 'featSplit', group: 'people', icon: 'restaurant-outline', route: '/split', title: 'split.title' },
  { id: 'ious', flag: 'featIous', group: 'people', icon: 'swap-horizontal', route: '/ious', title: 'ious.title' },
  { id: 'register', flag: 'featRegister', group: 'safety', icon: 'shield-checkmark-outline', route: '/register', title: 'more.register' },
];
export const GROUPS: readonly FeatureGroup[] = ['money', 'people', 'safety'];
export const featureById = (id: FeatureId): FeatureDef => FEATURES.find((f) => f.id === id) as FeatureDef;

/** How much of each feature a person already has, from what the app has loaded. */
export interface Usage { debts: number; ious: number; split: number; pools: number; recurring: number; household: boolean; giving: number; register: number }

/** The features someone is already using, so switching to "simple by default" never takes one away from them. */
export function featuresInUse(u: Usage): FeatureId[] {
  const on: FeatureId[] = [];
  if (u.recurring > 0) on.push('recurring');
  if (u.debts > 0) on.push('debts');
  if (u.giving > 0) on.push('giving');
  if (u.pools > 0) on.push('pools');
  if (u.household) on.push('household');
  if (u.split > 0) on.push('split');
  if (u.ious > 0) on.push('ious');
  if (u.register > 0) on.push('register');
  return on;
}
