import { parseAmount, parseRate, toMvrLaari } from '@/lib/money';

/** A foreign-currency payday line the person chose to keep in that currency. `amount_minor` is in minor units (100 per unit). */
export interface KeptIncome { currency: string; amount_minor: number; mvr_laari: number }
export interface Conversion { id: string; currency: string; amount_minor: number; mvr_laari: number; converted_at: string; note: string | null }

export interface Holding {
  currency: string;
  /** Held now, minor units. */
  minor: number;
  /** All kept so far, and what that was worth in MVR on the paydays. */
  keptMinor: number;
  keptMvr: number;
}

/** What is still held in each foreign currency: kept income minus what has been exchanged. Currencies at zero are left out. */
export function holdings(kept: readonly KeptIncome[], conversions: readonly Pick<Conversion, 'currency' | 'amount_minor'>[]): Holding[] {
  const by = new Map<string, Holding>();
  for (const k of kept) {
    const h = by.get(k.currency) ?? { currency: k.currency, minor: 0, keptMinor: 0, keptMvr: 0 };
    h.keptMinor += k.amount_minor; h.keptMvr += k.mvr_laari; h.minor += k.amount_minor;
    by.set(k.currency, h);
  }
  for (const c of conversions) {
    const h = by.get(c.currency);
    if (h) h.minor -= c.amount_minor;
  }
  return [...by.values()].filter((h) => h.minor > 0).sort((a, b) => b.minor - a.minor);
}

/** The MVR value of `minor` at the average rate it was received at (integer maths, rounded to the nearest laari). */
export const paydayValue = (h: Pick<Holding, 'keptMinor' | 'keptMvr'>, minor: number): number =>
  h.keptMinor > 0 ? Math.round((minor * h.keptMvr) / h.keptMinor) : 0;

/** MVR gained (positive) or lost (negative) by exchanging `minor` for `mvr` instead of keeping it at the payday rate. */
export const conversionGain = (h: Pick<Holding, 'keptMinor' | 'keptMvr'>, minor: number, mvr: number): number => mvr - paydayValue(h, minor);

export type ConversionCheck = { ok: true; minor: number; mvr: number } | { ok: false; error: 'amount' | 'mvr' | 'tooMuch' };

/** Check what was typed for an exchange: positive amounts, and not more than is held. */
export function checkConversion(h: Pick<Holding, 'minor'>, amountText: string, mvrText: string): ConversionCheck {
  let minor: number; let mvr: number;
  try { minor = parseAmount(amountText); } catch { return { ok: false, error: 'amount' }; }
  if (minor <= 0) return { ok: false, error: 'amount' };
  if (minor > h.minor) return { ok: false, error: 'tooMuch' };
  try { mvr = parseAmount(mvrText); } catch { return { ok: false, error: 'mvr' }; }
  if (mvr <= 0) return { ok: false, error: 'mvr' };
  return { ok: true, minor, mvr };
}

/** One line of a split payday as typed. */
export interface SplitLine { currency: string; amount: string; rate: string; keep: boolean }
export interface SplitIncome { amount_laari: number; currency: string; fx_rate_to_mvr: string; keep_in_currency: boolean }
export type SplitErrors = { amount?: true; rate?: true };

/** Turn the typed lines into income rows. Blank-amount lines are skipped; any line with a bad amount or rate is reported. */
export function buildSplit(lines: readonly SplitLine[]): { rows: SplitIncome[]; errors: SplitErrors[] } {
  const rows: SplitIncome[] = []; const errors: SplitErrors[] = [];
  for (const l of lines) {
    const err: SplitErrors = {};
    if (!l.amount.trim()) { errors.push(err); continue; }
    let minor = 0;
    try { minor = parseAmount(l.amount); if (minor <= 0) err.amount = true; } catch { err.amount = true; }
    let rate = '1';
    if (l.currency !== 'MVR') { try { parseRate(l.rate); rate = l.rate.trim(); } catch { err.rate = true; } }
    errors.push(err);
    if (!err.amount && !err.rate) rows.push({ amount_laari: minor, currency: l.currency, fx_rate_to_mvr: rate, keep_in_currency: l.currency !== 'MVR' && l.keep });
  }
  return { rows, errors };
}

/** MVR value of a line for the "total in MVR" preview; null when it cannot be worked out yet. */
export function lineMvr(l: SplitLine): number | null {
  try {
    const minor = parseAmount(l.amount);
    return l.currency === 'MVR' ? minor : toMvrLaari(minor, l.rate);
  } catch { return null; }
}
