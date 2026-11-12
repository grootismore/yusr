import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { isDhivehi } from '@/lib/fonts';
import { formatMVR, parseMVR } from '@/lib/money';
import type { Category } from './types';

/**
 * The two-digit year with its apostrophe, written so it always reads "’26". Inside right-to-left
 * text a lone apostrophe would flip to the other side of the digits ("26’"), so in Dhivehi the
 * pair is isolated as one left-to-right unit (U+2066 ... U+2069).
 */
const shortYear = (year: string, language: string): string => (isDhivehi(language) ? `\u2066’${year}\u2069` : `’${year}`);

/**
 * "5 Nov ’26": short month and a two-digit year (the apostrophe keeps "Nov ’26" from reading as
 * the 26th). Month names come from the active language (Intl lacks Dhivehi on some devices).
 */
export function useFormatDate() {
  const { t, i18n } = useTranslation();
  return useCallback(
    (iso: string) => {
      const [year, month, day] = iso.split('-');
      return `${Number(day)} ${t(`monthsShort.m${month}`)} ${shortYear(year.slice(2), i18n.language)}`;
    },
    [t, i18n.language],
  );
}

/** "Nov ’26", for a "2026-11" month. */
export function useMonthLabel() {
  const { t, i18n } = useTranslation();
  return useCallback(
    (month: string) => `${t(`monthsShort.m${month.slice(5, 7)}`)} ${shortYear(month.slice(2, 4), i18n.language)}`,
    [t, i18n.language],
  );
}

export function useCategoryName() {
  const { i18n } = useTranslation();
  return useCallback(
    (category: Category | undefined) =>
      !category ? '' : i18n.language === 'dv' && category.name_dv ? category.name_dv : category.name_en,
    [i18n.language],
  );
}

/** Laari to editable text ("1,250.00", "-5.00"), without the currency prefix. */
export const toInputText = (laari: number): string => formatMVR(laari).replace('MVR ', '');

/** Positive laari from user text, or null if empty/invalid/zero. */
export function parsePositiveAmount(text: string): number | null {
  try {
    const value = parseMVR(text);
    return value > 0 ? value : null;
  } catch {
    return null;
  }
}

/** Zero or more laari from user text, or null if invalid. Empty text counts as zero. */
export function parseNonNegativeAmount(text: string): number | null {
  if (text.trim() === '') return 0;
  try {
    const value = parseMVR(text);
    return value >= 0 ? value : null;
  } catch {
    return null;
  }
}

/**
 * "12.5" -> 1250 basis points (12.5%). At most two decimals, 0-1000%, integer maths only.
 * Returns null when invalid; empty text is not valid here (callers treat empty as "no rate").
 */
export function parsePercentToBps(text: string): number | null {
  const match = /^(\d{1,4})(?:\.(\d{1,2}))?$/.exec(text.trim());
  if (!match) return null;
  const bps = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return bps <= 100000 ? bps : null;
}

/** 1250 -> "12.5", 600 -> "6", 1205 -> "12.05". */
export const bpsToPercentText = (bps: number): string =>
  `${Math.floor(bps / 100)}${bps % 100 === 0 ? '' : `.${String(bps % 100).padStart(2, '0').replace(/0$/, '')}`}`;
