import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toHijri } from './hijri';

const pad = (n: number) => String(n).padStart(2, '0');

/** "25 Rabiʿ al-Thani 1448", for showing beside the Gregorian date. */
export function useFormatHijri() {
  const { t } = useTranslation();
  return useCallback(
    (iso: string, adjustment = 0) => {
      const h = toHijri(iso, adjustment);
      return `${h.day} ${t(`hijri.months.m${pad(h.month)}`)} ${h.year}`;
    },
    [t],
  );
}

/** "Rabiʿ al-Thani 1448". */
export function useHijriMonthLabel() {
  const { t } = useTranslation();
  return useCallback(
    (iso: string, adjustment = 0) => {
      const h = toHijri(iso, adjustment);
      return `${t(`hijri.months.m${pad(h.month)}`)} ${h.year}`;
    },
    [t],
  );
}
