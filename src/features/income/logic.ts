import type { IncomeRow } from '@/data/api';
import { nameOf, type HouseholdEntry, type HouseholdMember } from '@/features/household/logic';

export interface CurrencyAmount { currency: string; minor: number; mvr: number }
export interface SourceGroup { name: string; total: number; currencies: CurrencyAmount[] }
export interface PersonTotal { id: string; name: string; total: number; you: boolean }
export interface IncomeEntry {
  kind: 'own' | 'shared'; id: string; date: string; title: string | null; who: string;
  mvr: number; minor: number; currency: string; kept: boolean;
}
export interface IncomeBreakdown {
  total: number;
  /** Only present when someone else's income is in the total (a household). */
  byPerson: PersonTotal[];
  bySource: SourceGroup[];
  /** Amounts that came in a currency other than MVR, so the original amount is not lost behind the MVR value. */
  foreign: CurrencyAmount[];
  entries: IncomeEntry[];
}

const addTo = (list: CurrencyAmount[], c: CurrencyAmount): CurrencyAmount[] => {
  const hit = list.find((x) => x.currency === c.currency);
  if (hit) { hit.minor += c.minor; hit.mvr += c.mvr; } else list.push({ ...c });
  return list;
};

/**
 * The month's income taken apart: by person, by source (what the entry was called, like Salary), by foreign currency, and
 * the entries themselves. The total is your own income plus the income put in the shared pot, the same as the Home tile.
 * A split payday is several entries with one name, so it comes out as one source with its currencies listed.
 */
export function incomeBreakdown(own: readonly IncomeRow[], shared: readonly HouseholdEntry[], members: readonly HouseholdMember[], me: string | null, labels: { you: string; income: string; someone: string }): IncomeBreakdown {
  const entries: IncomeEntry[] = [
    ...own.map((i): IncomeEntry => ({ kind: 'own', id: i.id, date: i.received_at, title: i.note, who: me ?? 'you', mvr: i.mvr_laari, minor: i.amount_laari, currency: i.currency, kept: !!i.keep_in_currency })),
    ...shared.filter((e) => e.kind === 'income').map((e): IncomeEntry => ({ kind: 'shared', id: e.id, date: e.entry_date, title: e.note, who: e.user_id, mvr: e.mvr_laari, minor: e.amount_laari, currency: e.currency, kept: !!e.keep_in_currency })),
  ].sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));

  const people = new Map<string, PersonTotal>();
  const sources = new Map<string, SourceGroup>();
  const foreign: CurrencyAmount[] = [];
  let total = 0;
  for (const e of entries) {
    total += e.mvr;
    const you = e.kind === 'own' || e.who === me;
    const id = you ? 'you' : e.who;
    const p = people.get(id) ?? { id, name: you ? labels.you : nameOf(members, e.who) || labels.someone, total: 0, you };
    p.total += e.mvr; people.set(id, p);
    const name = (e.title ?? '').trim() || labels.income;
    const key = name.toLowerCase();
    const s = sources.get(key) ?? { name, total: 0, currencies: [] };
    s.total += e.mvr; addTo(s.currencies, { currency: e.currency, minor: e.minor, mvr: e.mvr }); sources.set(key, s);
    if (e.currency !== 'MVR') addTo(foreign, { currency: e.currency, minor: e.minor, mvr: e.mvr });
  }
  const byTotal = <T extends { total: number }>(a: T, b: T) => b.total - a.total;
  return {
    total,
    byPerson: people.size > 1 ? [...people.values()].sort(byTotal) : [],
    bySource: [...sources.values()].sort(byTotal),
    foreign: foreign.sort((a, b) => b.mvr - a.mvr),
    entries,
  };
}
