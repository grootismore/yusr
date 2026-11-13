import { authErrorKey } from '@/lib/authErrors';
import { MIN_PASSWORD, checkPassword, isEmail } from '@/lib/authForm';

describe('auth error mapping', () => {
  it.each([
    [{ code: 'invalid_credentials' }, 'invalid'],
    [{ message: 'Invalid login credentials' }, 'invalid'],
    [{ code: 'email_not_confirmed' }, 'unconfirmed'],
    [{ message: 'Email not confirmed' }, 'unconfirmed'],
    [{ code: 'user_already_exists' }, 'exists'],
    [{ message: 'User already registered' }, 'exists'],
    [{ code: 'weak_password' }, 'weak'],
    [{ code: 'over_email_send_rate_limit' }, 'rate'],
    [{ status: 429 }, 'rate'],
    [{ message: 'Network request failed' }, 'network'],
    [{ message: 'something odd' }, 'generic'],
  ])('maps %j to %s', (err, key) => expect(authErrorKey(err)).toBe(key));
});

describe('form checks', () => {
  it('emails', () => {
    expect(isEmail('a@b.mv')).toBe(true);
    expect(isEmail('  a@b.mv  ')).toBe(true);
    for (const bad of ['', 'a', 'a@b', '@b.mv', 'a b@c.mv']) expect(isEmail(bad)).toBe(false);
  });
  it('only length is required; letters and digits is a tip', () => {
    expect(checkPassword('1234567')).toEqual({ longEnough: false, mixed: false });
    expect(checkPassword('12345678')).toEqual({ longEnough: true, mixed: false });
    expect(checkPassword('abcdefg1')).toEqual({ longEnough: true, mixed: true });
    expect(MIN_PASSWORD).toBe(8);
  });
});
