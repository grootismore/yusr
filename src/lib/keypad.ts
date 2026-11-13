/** Amount typed on the on-screen keypad. The value is a plain string like "12.5"; parseAmount turns it into laari. */
export type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'back';

const MAX_WHOLE_DIGITS = 9;

export function pressKey(current: string, key: KeypadKey): string {
  if (key === 'back') return current.slice(0, -1);
  if (key === '.') return current.includes('.') ? current : `${current || '0'}.`;
  const [whole, fraction] = current.split('.');
  if (fraction !== undefined) return fraction.length >= 2 ? current : current + key;
  if (whole === '0') return key === '0' ? current : key; // no leading zeros
  if (whole.length >= MAX_WHOLE_DIGITS) return current;
  return current + key;
}

/** What the big display shows: "0" until something is typed, and a trailing dot stays visible. */
export const displayAmount = (value: string): string => {
  if (!value) return '0';
  const [whole, fraction] = value.split('.');
  const grouped = (whole || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
};
