import { setFlag, useFlag } from './flags';
import { money } from './money';

/** What a hidden amount looks like. */
export const MASK = '••••';

/** "Hide amounts": a choice kept on the device that blanks money across the app until it is switched off. */
export const useHideAmounts = (): boolean => useFlag('hideAmounts') === true;
export const setHideAmounts = (on: boolean): Promise<void> => setFlag('hideAmounts', on);

/** "MVR 1,234.50", or "MVR ••••" while amounts are hidden. For amounts written inside a sentence or label. */
export function useMoneyText(): (laari: number, currency?: string) => string {
  const hidden = useHideAmounts();
  return (laari, currency = 'MVR') => (hidden ? `${currency} ${MASK}` : money(laari, currency));
}
