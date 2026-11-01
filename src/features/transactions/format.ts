import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { formatMVR, parseMVR } from '@/lib/money';
import type { Category } from './types';

/** "5 November 2026", with month names from the active language (Intl lacks Dhivehi on some devices). */
export function useFormatDate() {
  const { t } = useTranslation();
  return useCallback(
    (iso: string) => {
      const [year, month, day] = iso.split('-');
      return `${Number(day)} ${t(`months.m${month}`)} ${year}`;
    },
    [t],
  );
}

export function useMonthLabel() {
  const { t } = useTranslation();
  return useCallback((month: string) => `${t(`months.m${month.slice(5, 7)}`)} ${month.slice(0, 4)}`, [t]);
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
