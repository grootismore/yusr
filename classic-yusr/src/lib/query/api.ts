import type { SupabaseClient } from '@supabase/supabase-js';
import type { Table } from './cache';

/** The only thing the offline queue needs from the server. Swapped for a fake in tests. */
export interface RowApi {
  fetchAll(table: Table): Promise<Record<string, unknown>[]>;
  upsert(table: Table, row: Record<string, unknown>): Promise<void>;
  softDelete(table: Table, id: string, at: string | null): Promise<void>;
  /** Encrypted debt fields (Vault, via security-definer functions). */
  getDebtSecrets(debtId: string): Promise<DebtSecrets>;
  setDebtSecrets(debtId: string, secrets: DebtSecrets): Promise<void>;
  /** Wasiyyah register: trusted contacts (online-only writes), encrypted note, audit log. */
  fetchContacts(): Promise<Record<string, unknown>[]>;
  createContact(row: Record<string, unknown>): Promise<void>;
  revokeContact(id: string): Promise<void>;
  getWasiyyahNote(): Promise<string>;
  setWasiyyahNote(note: string): Promise<void>;
  fetchAuditLog(): Promise<Record<string, unknown>[]>;
  logRegisterShared(sections: string[]): Promise<void>;
  /** The caller's own profile row. */
  fetchProfile(): Promise<Record<string, unknown> | null>;
  updateProfile(patch: Record<string, unknown>): Promise<void>;
  /** User rights: JSON export of the caller's data, and account deletion with a 7-day grace period. */
  exportMyData(): Promise<Record<string, unknown>>;
  fetchDeletionDate(): Promise<string | null>;
  requestAccountDeletion(): Promise<string>;
  cancelAccountDeletion(): Promise<void>;
  /** The caller's own consent records, and adding the ones given now (a repeat of one already stored is fine). */
  fetchConsents(): Promise<{ kind: string; version: string }[]>;
  recordConsents(kinds: readonly string[], version: string): Promise<void>;
}

export interface DebtSecrets {
  reference_no: string;
  notes: string;
}

const PAGE = 1000;

// ponytail: fetches every row, 1000 at a time. Add date-range windows if a user's history gets large.
export const createRowApi = (getClient: () => SupabaseClient): RowApi => ({
  async fetchAll(table) {
    const rows: Record<string, unknown>[] = [];
    for (let from = 0; ; from += PAGE) {
      const base = getClient().from(table).select('*');
      // Deleted transactions are never needed; archived rows of other tables are kept for old names.
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
  async getDebtSecrets(debtId) {
    const { data, error } = await getClient().rpc('get_debt_secrets', { p_debt_id: debtId });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return { reference_no: row?.reference_no ?? '', notes: row?.notes ?? '' };
  },
  async setDebtSecrets(debtId, secrets) {
    const { error } = await getClient().rpc('set_debt_secrets', {
      p_debt_id: debtId,
      p_reference_no: secrets.reference_no,
      p_notes: secrets.notes,
    });
    if (error) throw error;
  },
  async fetchContacts() {
    const { data, error } = await getClient().from('trusted_contacts').select('*').order('created_at');
    if (error) throw error;
    return data;
  },
  async createContact(row) {
    const { error } = await getClient().from('trusted_contacts').insert(row);
    if (error) throw error;
  },
  async revokeContact(id) {
    const { error } = await getClient().from('trusted_contacts').update({ status: 'revoked' }).eq('id', id);
    if (error) throw error;
  },
  async getWasiyyahNote() {
    const { data, error } = await getClient().rpc('get_wasiyyah_note');
    if (error) throw error;
    return (data as string | null) ?? '';
  },
  async setWasiyyahNote(note) {
    const { error } = await getClient().rpc('set_wasiyyah_note', { p_note: note });
    if (error) throw error;
  },
  async fetchAuditLog() {
    const { data, error } = await getClient().from('audit_log').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return data;
  },
  async logRegisterShared(sections) {
    const { error } = await getClient().rpc('log_register_shared', { p_sections: sections });
    if (error) throw error;
  },
  async fetchProfile() {
    const { data, error } = await getClient().from('profiles').select('*').maybeSingle();
    if (error) throw error;
    return data;
  },
  async updateProfile(patch) {
    const { data: auth } = await getClient().auth.getUser();
    if (!auth.user) throw new Error('not signed in');
    const { error } = await getClient().from('profiles').update(patch).eq('user_id', auth.user.id);
    if (error) throw error;
  },
  async exportMyData() {
    const { data, error } = await getClient().rpc('export_my_data');
    if (error) throw error;
    return data as Record<string, unknown>;
  },
  async fetchDeletionDate() {
    const { data, error } = await getClient().from('deletion_requests').select('scheduled_for').maybeSingle();
    if (error) throw error;
    return (data?.scheduled_for as string | undefined) ?? null;
  },
  async requestAccountDeletion() {
    const { data, error } = await getClient().rpc('request_account_deletion');
    if (error) throw error;
    return data as string;
  },
  async cancelAccountDeletion() {
    const { error } = await getClient().rpc('cancel_account_deletion');
    if (error) throw error;
  },
  async fetchConsents() {
    const { data, error } = await getClient().from('consents').select('kind, version');
    if (error) throw error;
    return data as { kind: string; version: string }[];
  },
  async recordConsents(kinds, version) {
    for (const kind of kinds) {
      const { error } = await getClient().from('consents').insert({ kind, version });
      if (error && error.code !== '23505') throw error; // already recorded
    }
  },
});
