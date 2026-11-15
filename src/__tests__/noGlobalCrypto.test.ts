import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

// The phone's JavaScript has no global `crypto`, so `crypto.randomUUID()` throws there (Raseedhu failed on it).
// Ids come from expo-crypto: `Crypto.randomUUID()`.
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? (f === '__tests__' || f === 'node_modules' ? [] : walk(p)) : /\.(ts|tsx)$/.test(f) ? [p] : [];
});

it('no screen or module uses the global crypto', () => {
  const bad = [...walk('app'), ...walk('src')].filter((f) => /(^|[^.\w])crypto\.(randomUUID|getRandomValues)/.test(readFileSync(f, 'utf8')));
  expect(bad).toEqual([]);
});
