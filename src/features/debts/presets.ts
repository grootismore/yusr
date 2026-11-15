import type { DebtKind } from './types';

/**
 * Common Maldivian products, so adding a card or loan is one tap. The rates and minimums are typical figures to
 * start from, not promises: the person checks them against their own statement and edits what differs.
 * `minPctBps` is a share of the balance due each month; `minFloorLaari` is the least that is ever due.
 */
export interface DebtPreset {
  id: string;
  bank: 'BML' | 'MIB';
  kinds: DebtKind[];
  /** Kind to select when the preset is chosen. */
  kind: DebtKind;
  label: string;
  rateBps: number;
  minPctBps: number | null;
  currency: 'MVR' | 'USD';
}

export const DEBT_PRESETS: readonly DebtPreset[] = [
  { id: 'bml-card', bank: 'BML', kinds: ['credit_card'], kind: 'credit_card', label: 'Visa / Mastercard', rateBps: 2400, minPctBps: 500, currency: 'USD' },
  { id: 'bml-lui-express', bank: 'BML', kinds: ['loan', 'bank'], kind: 'loan', label: 'Lui Express', rateBps: 1500, minPctBps: null, currency: 'MVR' },
  { id: 'bml-lui-micro', bank: 'BML', kinds: ['loan', 'bank'], kind: 'loan', label: 'Lui Micro', rateBps: 1200, minPctBps: null, currency: 'MVR' },
  { id: 'mib-dhiriulhun', bank: 'MIB', kinds: ['loan', 'personal', 'bank'], kind: 'loan', label: 'Ujaalaa Dhiriulhun', rateBps: 1500, minPctBps: null, currency: 'MVR' },
  { id: 'mib-mib9', bank: 'MIB', kinds: ['loan', 'personal', 'bank'], kind: 'loan', label: 'Ujaalaa (MIB9)', rateBps: 1300, minPctBps: null, currency: 'MVR' },
  { id: 'mib-hiyaa', bank: 'MIB', kinds: ['loan', 'bank'], kind: 'loan', label: 'Ujaalaa Hiyaa (home)', rateBps: 1100, minPctBps: null, currency: 'MVR' },
  { id: 'mib-ulhandhu', bank: 'MIB', kinds: ['loan', 'bank'], kind: 'loan', label: 'Ujaalaa Ulhandhu (vehicle)', rateBps: 1500, minPctBps: null, currency: 'MVR' },
];
