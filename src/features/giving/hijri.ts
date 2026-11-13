import umalqura from '@umalqura/core';
import { addDays } from '@/lib/dates';

/**
 * Umm al-Qura calendar via @umalqura/core (ported from classic-yusr, where it was checked against
 * Node's built-in Umm al-Qura calendar for 2000-2028 and the official 2026 dates). Outside that
 * window the tables are projections and may be a day out, which is what `adjustment` is for: +1
 * means the person's local moon sighting is one day later.
 */
export interface HijriDate { year: number; month: number; day: number }

const pad = (n: number) => String(n).padStart(2, '0');
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const noon = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d, 12); };

export function toHijri(iso: string, adjustment = 0): HijriDate {
  const h = umalqura(noon(addDays(iso, -adjustment)));
  return { year: h.hy, month: h.hm, day: h.hd };
}

export function fromHijri(year: number, month: number, day: number, adjustment = 0): string {
  return addDays(isoOf(umalqura(year, month, day).date), adjustment);
}

export const daysInHijriMonth = (year: number, month: number): number => umalqura(year, month, 1).daysInMonth;

/**
 * The next time (today included) a Hijri month/day comes round, as a Gregorian ISO date. Day 30
 * in a 29-day month falls on the 29th. This is how a person's own zakat date is found each year.
 */
export function nextHijriOccurrence(month: number, day: number, today: string, adjustment = 0): string {
  const year = toHijri(today, adjustment).year;
  for (const y of [year, year + 1, year + 2]) {
    const iso = fromHijri(y, month, Math.min(day, daysInHijriMonth(y, month)), adjustment);
    if (iso >= today) return iso;
  }
  return fromHijri(year + 3, month, 1, adjustment);
}

/** Whole days from `from` to `to` (both YYYY-MM-DD). */
export const daysBetween = (from: string, to: string): number => Math.round((noon(to).getTime() - noon(from).getTime()) / 86_400_000);
