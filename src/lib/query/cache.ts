export type Row = { id: string; deleted_at?: string | null };
export type Table =
  | 'accounts'
  | 'categories'
  | 'transactions'
  | 'debts'
  | 'receivables'
  | 'commitments'
  | 'recurring_items';

/** Insert or replace by id, keeping list order stable for existing rows. */
export function upsertById<T extends Row>(list: readonly T[], row: T): T[] {
  const index = list.findIndex((item) => item.id === row.id);
  if (index === -1) return [...list, row];
  return list.map((item, i) => (i === index ? row : item));
}

/**
 * Soft delete in the cached list. Everything except transactions is kept (marked
 * deleted) so old transactions can still show their names; transactions are
 * dropped because the server query never returns deleted ones.
 */
export function applySoftDelete<T extends Row>(table: Table, list: readonly T[], id: string, at: string | null): T[] {
  if (table === 'transactions') return list.filter((item) => item.id !== id);
  return list.map((item) => (item.id === id ? { ...item, deleted_at: at } : item));
}
