
import { afterTry, FREE_TRIES, hashPin, isValidPin, makePinRecord, NO_ATTEMPTS, pinMatches, secondsToWait } from './pin';
import { createHash } from 'node:crypto';

const digest = async (text: string) => createHash('sha256').update(text).digest('hex'); // the app uses expo-crypto's SHA-256

describe('PIN rules', () => {
  it('accepts exactly four digits', () => {
    expect(isValidPin('1234')).toBe(true);
    for (const bad of ['', '123', '12345', '123a', '12 4', '١٢٣٤']) expect(isValidPin(bad)).toBe(false);
  });

  it('keeps only a salted hash, and recognises the right PIN only', async () => {
    const record = await makePinRecord('2468', 'salt1', digest);
    expect(JSON.stringify(record)).not.toContain('2468'); // the PIN itself is never in the record
    expect(await pinMatches('2468', record, digest)).toBe(true);
    expect(await pinMatches('2469', record, digest)).toBe(false);
    expect(await pinMatches('246', record, digest)).toBe(false); // not even tried if it is not four digits
  });

  it('the same PIN with a different salt gives a different hash', async () => {
    expect(await hashPin('2468', 'a', digest)).not.toBe(await hashPin('2468', 'b', digest));
  });
});

describe('waiting after wrong tries', () => {
  const now = 1_000_000;
  it('gives five free tries, then waits 30 s, 60 s, 120 s ... up to an hour', () => {
    let a = NO_ATTEMPTS;
    for (let i = 1; i < FREE_TRIES; i++) {
      a = afterTry(a, false, now);
      expect(secondsToWait(a, now)).toBe(0);
    }
    a = afterTry(a, false, now); // the fifth wrong try
    expect(secondsToWait(a, now)).toBe(30);
    a = afterTry(a, false, now + 30_000);
    expect(secondsToWait(a, now + 30_000)).toBe(60);
    a = afterTry(a, false, now);
    expect(secondsToWait(a, now)).toBe(120);
    for (let i = 0; i < 20; i++) a = afterTry(a, false, now);
    expect(secondsToWait(a, now)).toBe(3600); // never longer than an hour
  });

  it('a correct PIN clears it, and the wait counts down', () => {
    const waiting = { failures: 6, lockedUntil: now + 45_000 };
    expect(secondsToWait(waiting, now)).toBe(45);
    expect(secondsToWait(waiting, now + 44_001)).toBe(1);
    expect(secondsToWait(waiting, now + 45_000)).toBe(0);
    expect(afterTry(waiting, true, now)).toEqual(NO_ATTEMPTS);
  });
});
