/** A money pool: friends or family who each put the same amount in every month; each member takes the pot out in turn. */
export interface MoneyPool {
  id: string; name: string; note: string | null;
  /** What the person puts in each month, in minor units of `currency`. */
  amount_minor: number; currency: string; due_day: number;
  members: number | null; payout_month: string | null; payout_received: boolean;
  started_on: string; ended_on: string | null;
}
export type PoolInput = Pick<MoneyPool, 'name' | 'note' | 'amount_minor' | 'currency' | 'due_day' | 'members' | 'payout_month' | 'payout_received'>;
export interface PoolPayment { id: string; pool_id: string; expense_id: string; period: string }

export const activePools = (all: readonly MoneyPool[]): MoneyPool[] => all.filter((p) => !p.ended_on);
/** `month` is the first of a month, YYYY-MM-01. */
export const isPoolPaid = (pool: MoneyPool, payments: readonly PoolPayment[], month: string): boolean => payments.some((p) => p.pool_id === pool.id && p.period === month);
/** What the person takes out: every member's contribution, if the number of members is known. */
export const payoutMinor = (pool: MoneyPool): number | null => (pool.members ? pool.amount_minor * pool.members : null);
/** It is the person's month to take the pot, and they have not recorded it yet. */
export const payoutDue = (pool: MoneyPool, month: string): boolean => !!pool.payout_month && pool.payout_month <= month && !pool.payout_received && !pool.ended_on;
/** Every active pool's monthly amount in MVR, using `toMvr` for foreign currencies. */
export const monthlyTotal = (pools: readonly MoneyPool[], toMvr: (minor: number, currency: string) => number): number => activePools(pools).reduce((s, p) => s + toMvr(p.amount_minor, p.currency), 0);
