import { authErrorKey, isValidEmail } from './authErrors';
import { AUTO_LOCK_MS, shouldRelock } from './lockLogic';

describe('authErrorKey', () => {
  it.each([
    [{ code: 'invalid_credentials', status: 400 }, 'auth.errors.invalidCredentials'],
    [{ code: 'user_already_exists' }, 'auth.errors.cannotCreate'],
    [{ code: 'email_exists' }, 'auth.errors.cannotCreate'],
    [{ code: 'weak_password' }, 'auth.errors.passwordShort'],
    [{ status: 429 }, 'auth.errors.tooMany'],
    [{ code: 'over_request_rate_limit' }, 'auth.errors.tooMany'],
    [{ name: 'AuthRetryableFetchError' }, 'auth.errors.network'],
    [{ message: 'Network request failed' }, 'auth.errors.network'],
    [{ code: 'something_new', message: 'leaky server detail' }, 'auth.errors.generic'],
    [{}, 'auth.errors.generic'],
  ])('maps %j to %s', (error, key) => {
    expect(authErrorKey(error)).toBe(key);
  });
});

describe('isValidEmail', () => {
  it('accepts normal addresses and rejects junk', () => {
    expect(isValidEmail('a@example.mv')).toBe(true);
    expect(isValidEmail(' a@example.mv ')).toBe(true);
    for (const bad of ['', 'a', 'a@', '@b.c', 'a@b', 'a b@c.d']) expect(isValidEmail(bad)).toBe(false);
  });
});

describe('shouldRelock', () => {
  it('never relocks if the app was not backgrounded', () => {
    expect(shouldRelock(null, 1_000_000)).toBe(false);
  });
  it('relocks only once the timeout has elapsed', () => {
    expect(shouldRelock(0, AUTO_LOCK_MS - 1)).toBe(false);
    expect(shouldRelock(0, AUTO_LOCK_MS)).toBe(true);
    expect(shouldRelock(1000, 1000 + 5 * AUTO_LOCK_MS)).toBe(true);
  });
  it('honours a custom timeout', () => {
    expect(shouldRelock(0, 5_000, 10_000)).toBe(false);
    expect(shouldRelock(0, 10_000, 10_000)).toBe(true);
  });
});
