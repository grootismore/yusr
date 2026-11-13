import { displayAmount, pressKey, type KeypadKey } from '@/lib/keypad';

const type = (keys: KeypadKey[]) => keys.reduce((v, k) => pressKey(v, k), '');

describe('keypad', () => {
  it('builds an amount', () => expect(type(['1', '2', '.', '5'])).toBe('12.5'));
  it('no leading zeros', () => expect(type(['0', '0', '7'])).toBe('7'));
  it('a lone dot becomes 0.', () => expect(type(['.'])).toBe('0.'));
  it('only one dot', () => expect(type(['1', '.', '.', '2'])).toBe('1.2'));
  it('stops at two decimals', () => expect(type(['1', '.', '2', '3', '4'])).toBe('1.23'));
  it('backspace', () => expect(type(['1', '2', 'back'])).toBe('1'));
  it('caps the length', () => expect(type(Array(12).fill('9') as KeypadKey[]).length).toBe(9));
  it('groups thousands for display', () => {
    expect(displayAmount('')).toBe('0');
    expect(displayAmount('1234567.5')).toBe('1,234,567.5');
    expect(displayAmount('12.')).toBe('12.');
  });
});
