import { isNetworkError } from '@/lib/online';
import { KEEP } from '@/lib/queryCache';

it('recognises a request that never got through', () => {
  expect(isNetworkError(new TypeError('Network request failed'))).toBe(true);
  expect(isNetworkError(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }))).toBe(true);
  expect(isNetworkError(new Error('duplicate key value'))).toBe(false);
});

it('keeps only the person\'s own money records on the phone, never the register or trusted people', () => {
  for (const k of ['register-items', 'contacts', 'contact-cases', 'checkin', 'audit', 'consents']) expect(KEEP.has(k)).toBe(false);
  for (const k of ['expenses', 'income', 'debts', 'giving']) expect(KEEP.has(k)).toBe(true);
});
