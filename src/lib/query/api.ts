import type { SupabaseClient } from '@supabase/supabase-js';
import type { Table } from './cache';

/** The only thing the offline queue needs from the server. Swapped for a fake in tests. */
export interface RowApi {
  fetchAll(table: Table): Promise<Record<string, unknown>[]>;
  upsert(table: Table, row: Record<string, unknown>): Promise<void>;
  softDelete(table: Table, id: string, at: string): Promise<void>;
}

const PAGE = 1000;

// ponytail: fetches every row, 1000 at a time. Add date-range windows if a user's history gets large.
export const createRowApi = (getClient: () => SupabaseClient): RowApi => ({
  async fetchAll(table) {
    const rows: Record<string, unknown>[] = [];
    for (let from = 0; ; from += PAGE) {
      const base = getClient().from(table).select('*');
      const filtered = table === 'transactions' ? base.is('deleted_at', null) : base;
      const { data, error } = await filtered.order('created_at').order('id').range(from, from + PAGE - 1);
      if (error) throw error;
      rows.push(...data);
      if (data.length < PAGE) return rows;
    }
  },
  async upsert(table, row) {
    const { error } = await getClient().from(table).upsert(row, { onConflict: 'id' });
    if (error) throw error;
  },
  async softDelete(table, id, at) {
    const { error } = await getClient().from(table).update({ deleted_at: at }).eq('id', id);
    if (error) throw error;
  },
});
