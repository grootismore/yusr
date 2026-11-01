import { add, subtract, sum } from '@/lib/money';
import type { Account, Category, Kind, Transaction } from './types';

/** Local calendar date as YYYY-MM-DD (never UTC, so late-evening entries keep their day). */
export function toISODate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parse YYYY-MM-DD as a local date at noon (immune to DST edges). */
export function fromISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export const monthOf = (isoDate: string): string => isoDate.slice(0, 7);

export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number);
  const index = year * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

/** Money in (+) or out (-) of an account. Giving and expenses both reduce the balance. */
export function signedAmount(t: Pick<Transaction, 'kind' | 'amount_laari'>): number {
  return t.kind === 'income' ? t.amount_laari : -t.amount_laari;
}

/** Balance is always derived: opening balance plus every live transaction. */
export function accountBalance(account: Account, transactions: readonly Transaction[]): number {
  return transactions
    .filter((t) => t.account_id === account.id && t.deleted_at === null)
    .reduce((balance, t) => add(balance, signedAmount(t)), account.opening_balance_laari);
}

export interface DaySection {
  date: string;
  data: Transaction[];
  /** Net movement for the day (income minus expenses and giving). */
  net: number;
}

/** Newest day first; within a day, newest entry first. */
export function groupByDay(transactions: readonly Transaction[]): DaySection[] {
  const byDay = new Map<string, Transaction[]>();
  for (const t of transactions) {
    if (t.deleted_at !== null) continue;
    byDay.set(t.occurred_on, [...(byDay.get(t.occurred_on) ?? []), t]);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([date, data]) => ({
      date,
      data: data.sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0)),
      net: sum(data.map(signedAmount)),
    }));
}

export interface MonthSummary {
  income: number;
  expense: number;
  giving: number;
  /** income - expense - giving */
  net: number;
}

export function monthSummary(transactions: readonly Transaction[], month: string): MonthSummary {
  const totals: Record<Kind, number> = { income: 0, expense: 0, giving: 0 };
  for (const t of transactions) {
    if (t.deleted_at === null && monthOf(t.occurred_on) === month) {
      totals[t.kind] = add(totals[t.kind], t.amount_laari);
    }
  }
  return { ...totals, net: subtract(subtract(totals.income, totals.expense), totals.giving) };
}

export interface BreakdownItem {
  categoryId: string;
  total: number;
  /** Whole-number percentage of all outgoing money this month (rounded, may not sum to 100). */
  percent: number;
}

/** Outgoing money (expense + giving) per category for a month, largest first. */
export function categoryBreakdown(transactions: readonly Transaction[], month: string): BreakdownItem[] {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.deleted_at === null && t.kind !== 'income' && monthOf(t.occurred_on) === month) {
      totals.set(t.category_id, add(totals.get(t.category_id) ?? 0, t.amount_laari));
    }
  }
  const grand = sum([...totals.values()]);
  return [...totals.entries()]
    .map(([categoryId, total]) => ({
      categoryId,
      total,
      // Integer-only percentage: round(total * 100 / grand) without floats on money.
      percent: grand === 0 ? 0 : Math.round((total * 100) / grand),
    }))
    .sort((a, b) => b.total - a.total || (a.categoryId < b.categoryId ? -1 : 1));
}

export function categoryName(category: Category | undefined, language: string): string {
  if (!category) return '';
  return language === 'dv' && category.name_dv ? category.name_dv : category.name_en;
}
