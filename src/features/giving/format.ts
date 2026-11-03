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

/** "Jumada al-Ula – Jumada al-Thani 1448" for a Gregorian month, or both years when it straddles two. */
export function useHijriRange() {
  const { t } = useTranslation();
  return useCallback(
    (startIso: string, endIso: string, adjustment = 0) => {
      const a = toHijri(startIso, adjustment);
      const b = toHijri(endIso, adjustment);
      const name = (month: number) => t(`hijri.months.m${pad(month)}`);
      if (a.year === b.year && a.month === b.month) return `${name(a.month)} ${a.year}`;
      if (a.year === b.year) return `${name(a.month)} – ${name(b.month)} ${a.year}`;
      return `${name(a.month)} ${a.year} – ${name(b.month)} ${b.year}`;
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
