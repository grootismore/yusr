import { isLtrInput } from '@/lib/inputs';

describe('which inputs are always left to right', () => {
  it('email, password, numbers, dates, phone and links are', () => {
    expect(isLtrInput({ keyboardType: 'email-address' })).toBe(true);
    expect(isLtrInput({ secureTextEntry: true })).toBe(true);
    expect(isLtrInput({ keyboardType: 'decimal-pad' })).toBe(true);
    expect(isLtrInput({ keyboardType: 'numbers-and-punctuation' })).toBe(true);
    expect(isLtrInput({ keyboardType: 'phone-pad' })).toBe(true);
    expect(isLtrInput({ textContentType: 'newPassword' })).toBe(true);
    expect(isLtrInput({ autoComplete: 'current-password' })).toBe(true);
  });
  it('ordinary text (names, merchants, notes) follows the language', () => {
    expect(isLtrInput({})).toBe(false);
    expect(isLtrInput({ keyboardType: 'default' })).toBe(false);
  });
});
