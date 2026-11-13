import { FunctionsHttpError } from '@supabase/supabase-js';
import { addMonths } from '@/lib/dates';
import { toMvrLaari } from '@/lib/money';
import { type BudgetRow } from '@/lib/budget';
import { type Draft, compressReceipt } from '@/lib/receipt';
import { PREVIEW, getSupabase } from '@/lib/supabase';
import { getItem, setItem } from '@/lib/kv';
import * as fx from './preview';
import type { Category, Expense, NewExpense, Profile, ScanItemInput } from './types';
import type { Debt, DebtInput, DebtPayment } from '@/features/debts/types';
import type { GivingEntry, GivingKind } from '@/features/giving/logic';
import { inviteLink, newInviteToken } from '@/features/register/invite';
import type { ConsentKind } from '@/features/legal/consent';
import type { AuditEntry, Checkin, ContactCase, ContactRegister, RegisterItem, RegisterKind, TrustedContact } from '@/features/register/types';

async function uid(): Promise<string> {
  const { data } = await getSupabase().auth.getSession();
  if (!data.session) throw new Error('Not signed in');
  return data.session.user.id;
}

const must = <T>(r: { data: T | null; error: { message: string } | null }): T => {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
};

export async function listCategories(): Promise<Category[]> {
  if (PREVIEW) return fx.categories;
  return must(await getSupabase().from('categories').select('id,user_id,slug,name_dv,name_en,icon').order('created_at'));
}

export async function listExpenses(month: string): Promise<Expense[]> {
  if (PREVIEW) return fx.expenses(month);
  return must(
    await getSupabase().from('expenses').select('*').gte('spent_at', month).lt('spent_at', addMonths(month, 1))
      .order('spent_at', { ascending: false }).order('created_at', { ascending: false }),
  );
}

export async function addExpense(input: NewExpense): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('expenses').insert({ ...input, user_id: await uid(), source: 'manual' }));
}

export async function listBudgets(month: string): Promise<BudgetRow[]> {
  if (PREVIEW) return fx.budgets;
  return must(await getSupabase().from('budgets').select('id,month,category_id,limit_laari').lte('month', month));
}

/** Set the limit from `month` on. category null = the whole month. */
export async function setBudget(month: string, categoryId: string | null, limitLaari: number): Promise<void> {
  if (PREVIEW) return;
  must(
    await getSupabase().from('budgets').upsert(
      { user_id: await uid(), month, category_id: categoryId, limit_laari: limitLaari },
      { onConflict: 'user_id,month,category_id' },
    ),
  );
}

/** Remove the limit entirely (every month's row for it). */
export async function clearBudget(categoryId: string | null): Promise<void> {
  if (PREVIEW) return;
  const q = getSupabase().from('budgets').delete();
  must(await (categoryId ? q.eq('category_id', categoryId) : q.is('category_id', null)));
}

export async function scansUsed(month: string): Promise<number> {
  if (PREVIEW) return 3;
  const r = must(await getSupabase().from('scan_usage').select('scans_used').eq('month', month).maybeSingle());
  return (r as { scans_used: number } | null)?.scans_used ?? 0;
}

export async function getProfile(): Promise<Profile> {
  if (PREVIEW) return { language: 'dv', base_currency: 'MVR', keep_receipt_images: false };
  return must(await getSupabase().from('profiles').select('language,base_currency,keep_receipt_images').single());
}

export async function updateProfile(patch: Partial<Profile>): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('profiles').update(patch).eq('id', await uid()));
}

// ---- manual exchange rates (device-local; "1 USD = 15.42 MVR")
const RATES_KEY = 'kharadhu.rates';
export async function getRates(): Promise<Record<string, string>> {
  try { return JSON.parse((await getItem(RATES_KEY)) ?? '{}'); } catch { return {}; }
}
export async function saveRate(code: string, rate: string): Promise<void> {
  await setItem(RATES_KEY, JSON.stringify({ ...(await getRates()), [code]: rate }));
}

// ---- Raseedhu
export type ScanFailure = 'unreadable' | 'offline' | 'quota' | 'failed';
export class ScanError extends Error {
  constructor(public kind: ScanFailure, public draft: Draft | null = null) { super(kind); }
}
export interface ScanResult { draft: Draft; imageDeleted: boolean; scansLeft: number; path: string }

/** Compress on the device, upload to the user's own folder, ask the function for a draft. */
export async function scanReceipt(localUri: string, onStep?: (s: 'uploading' | 'reading') => void): Promise<ScanResult> {
  if (PREVIEW) throw new ScanError('failed');
  const supabase = getSupabase();
  onStep?.('uploading');
  const path = `${await uid()}/${crypto.randomUUID()}.jpg`;
  try {
    const { uri } = await compressReceipt(localUri);
    const body = await (await fetch(uri)).arrayBuffer();
    const up = await supabase.storage.from('receipts').upload(path, body, { contentType: 'image/jpeg' });
    if (up.error) throw up.error;
    onStep?.('reading');
    const { data, error } = await supabase.functions.invoke('scan-receipt', { body: { image_path: path } });
    if (error) {
      const detail = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null;
      if (detail?.error === 'quota_exceeded') throw new ScanError('quota');
      if (detail?.error === 'unreadable') throw new ScanError('unreadable', detail.draft ?? null);
      throw new ScanError(detail ? 'failed' : 'offline');
    }
    return { draft: data.draft, imageDeleted: data.image_deleted, scansLeft: data.scans_left, path };
  } catch (e) {
    if (e instanceof ScanError) {
      if (e.kind !== 'unreadable') void deleteReceiptImage(path);
      throw e;
    }
    void deleteReceiptImage(path);
    throw new ScanError(/network|fetch|failed to send/i.test(String((e as Error).message)) ? 'offline' : 'failed');
  }
}

export async function deleteReceiptImage(path: string): Promise<void> {
  if (PREVIEW) return;
  await getSupabase().storage.from('receipts').remove([path]).catch(() => undefined);
}

/**
 * Save a confirmed scan: receipt, its items, then the expense.
 * ponytail: three inserts, not one transaction; a failure part-way removes the receipt again. Move to an RPC if this ever leaves orphans.
 */
export async function saveScan(a: {
  expense: NewExpense; draft: Draft; gstLaari: number | null; items: ScanItemInput[]; imagePath: string | null; needsReview: boolean; model?: string;
}): Promise<void> {
  if (PREVIEW) return;
  const supabase = getSupabase();
  const user_id = await uid();
  const receipt = must(
    await supabase.from('receipts').insert({
      user_id, image_path: a.imagePath, status: a.needsReview ? 'needs_review' : 'confirmed', raw_json: a.draft, gst_laari: a.gstLaari,
    }).select('id').single(),
  ) as { id: string };
  try {
    if (a.items.length) {
      must(await supabase.from('receipt_items').insert(a.items.map((i) => ({ receipt_id: receipt.id, user_id, name: i.name, qty: i.qty, total_laari: i.total_laari }))));
    }
    must(await supabase.from('expenses').insert({ ...a.expense, user_id, source: 'scan', receipt_id: receipt.id }));
  } catch (e) {
    await supabase.from('receipts').delete().eq('id', receipt.id);
    throw e;
  }
}

/** MVR value of a foreign amount, for display while typing. Null when the inputs are not valid yet. */
export function previewMvr(minor: number | null, rate: string): number | null {
  try { return minor === null ? null : toMvrLaari(minor, rate); } catch { return null; }
}

// ---- debts (Module 1)
export async function listDebts(): Promise<Debt[]> {
  if (PREVIEW) return fx.debts;
  const supabase = getSupabase();
  const rows = must(await supabase.from('debts').select('*').order('created_at')) as (Omit<Debt, 'balance_laari' | 'paid_laari'>)[];
  const bal = must(await supabase.from('debt_balances').select('id,paid_laari,balance_laari')) as { id: string; paid_laari: number; balance_laari: number }[];
  const byId = new Map(bal.map((b) => [b.id, b]));
  return rows.map((r) => ({ ...r, paid_laari: byId.get(r.id)?.paid_laari ?? 0, balance_laari: byId.get(r.id)?.balance_laari ?? r.opening_balance_laari }));
}

export async function listDebtPayments(): Promise<DebtPayment[]> {
  if (PREVIEW) return fx.debtPayments;
  return must(await getSupabase().from('debt_payments').select('id,debt_id,amount_laari,paid_on,note').order('paid_on', { ascending: false }));
}

export async function saveDebt(input: DebtInput, id?: string): Promise<void> {
  if (PREVIEW) return;
  const supabase = getSupabase();
  must(id ? await supabase.from('debts').update(input).eq('id', id) : await supabase.from('debts').insert({ ...input, user_id: await uid() }));
}

export async function deleteDebt(id: string): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('debts').delete().eq('id', id));
}

export async function addDebtPayment(p: { debt_id: string; amount_laari: number; paid_on: string; note: string | null }): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('debt_payments').insert({ ...p, user_id: await uid() }));
}

export async function deleteDebtPayment(id: string): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('debt_payments').delete().eq('id', id));
}

// ---- the plan's settings (strategy and monthly amount) live on the device
const PLAN_KEY = 'kharadhu.debtplan';
export interface PlanSettings { strategy: 'snowball' | 'avalanche'; budgetLaari: number | null }
export const DEFAULT_PLAN: PlanSettings = { strategy: 'snowball', budgetLaari: null };
export async function getPlanSettings(): Promise<PlanSettings> {
  try { return { ...DEFAULT_PLAN, ...JSON.parse((await getItem(PLAN_KEY)) ?? '{}') }; } catch { return DEFAULT_PLAN; }
}
export async function savePlanSettings(p: PlanSettings): Promise<void> { await setItem(PLAN_KEY, JSON.stringify(p)); }

// ---- giving and zakat (Module 2)
export async function listGiving(month: string): Promise<GivingEntry[]> {
  if (PREVIEW) return fx.giving;
  const rows = must(
    await getSupabase().from('sadaqah_entries').select('id,expense_id,kind,recipient_note,expenses!inner(mvr_laari,spent_at)')
      .gte('expenses.spent_at', month).lt('expenses.spent_at', addMonths(month, 1)),
  ) as unknown as { id: string; expense_id: string; kind: GivingKind; recipient_note: string | null; expenses: { mvr_laari: number; spent_at: string } }[];
  return rows.map((r) => ({ id: r.id, expense_id: r.expense_id, kind: r.kind, recipient_note: r.recipient_note, amount_laari: r.expenses.mvr_laari, spent_at: r.expenses.spent_at }))
    .sort((a, b) => (a.spent_at < b.spent_at ? 1 : -1));
}

/**
 * Giving is an ordinary expense in the Giving category plus a sadaqah_entries row, so the amount lives in one place.
 * ponytail: two inserts, not one transaction; if the second fails the expense is removed again.
 */
export async function logGiving(a: { amount_laari: number; kind: GivingKind; spent_at: string; recipient_note: string | null }): Promise<void> {
  if (PREVIEW) return;
  const supabase = getSupabase();
  const user_id = await uid();
  const cat = must(await supabase.from('categories').select('id').eq('slug', 'giving').maybeSingle()) as { id: string } | null;
  const expense = must(
    await supabase.from('expenses').insert({ user_id, amount_laari: a.amount_laari, currency: 'MVR', fx_rate_to_mvr: 1, category_id: cat?.id ?? null, spent_at: a.spent_at, source: 'manual' }).select('id').single(),
  ) as { id: string };
  const r = await supabase.from('sadaqah_entries').insert({ user_id, expense_id: expense.id, kind: a.kind, recipient_note: a.recipient_note });
  if (r.error) {
    await supabase.from('expenses').delete().eq('id', expense.id);
    throw new Error(r.error.message);
  }
}

/** Deleting the expense removes the giving entry with it (cascade). */
export async function deleteGiving(expenseId: string): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('expenses').delete().eq('id', expenseId));
}

export interface ZakatSettings { sadaqah_goal_laari: number | null; zakat_hijri_month: number | null; zakat_hijri_day: number | null; zakat_reminder: boolean; hijri_adjustment: number }
export const DEFAULT_ZAKAT: ZakatSettings = { sadaqah_goal_laari: 5_000, zakat_hijri_month: 9, zakat_hijri_day: 1, zakat_reminder: false, hijri_adjustment: 0 };
const EMPTY_ZAKAT: ZakatSettings = { sadaqah_goal_laari: null, zakat_hijri_month: null, zakat_hijri_day: null, zakat_reminder: false, hijri_adjustment: 0 };

export async function getZakat(): Promise<ZakatSettings> {
  if (PREVIEW) return DEFAULT_ZAKAT;
  const r = must(await getSupabase().from('zakat_settings').select('sadaqah_goal_laari,zakat_hijri_month,zakat_hijri_day,zakat_reminder,hijri_adjustment').maybeSingle()) as ZakatSettings | null;
  return r ?? EMPTY_ZAKAT;
}

export async function saveZakat(z: ZakatSettings): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('zakat_settings').upsert({ user_id: await uid(), ...z }, { onConflict: 'user_id' }));
}

// ---- register, trusted contacts, check-ins (Module 3)
export async function listRegisterItems(): Promise<RegisterItem[]> {
  if (PREVIEW) return fx.registerItems;
  return must(await getSupabase().from('register_items').select('id,kind,title,counterparty,amount_laari').order('created_at'));
}

/** Details are encrypted in the database and only come back through this call. */
export async function getRegisterDetails(id: string): Promise<string> {
  if (PREVIEW) return 'Call him first. Receipt is in the blue folder.';
  return (must(await getSupabase().rpc('get_register_item_details', { p_id: id })) as string | null) ?? '';
}

export async function saveRegisterItem(a: { id?: string; kind: RegisterKind; title: string; counterparty: string | null; amount_laari: number | null; details: string }): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().rpc('save_register_item', { p_id: a.id ?? null, p_kind: a.kind, p_title: a.title, p_counterparty: a.counterparty, p_amount_laari: a.amount_laari, p_details: a.details }));
}

export async function deleteRegisterItem(id: string): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('register_items').delete().eq('id', id));
}

export async function listContacts(): Promise<TrustedContact[]> {
  if (PREVIEW) return fx.contacts;
  return must(await getSupabase().from('trusted_contacts').select('id,name,email,status,inviter_name,invite_expires_at').order('created_at'));
}

/**
 * Invite someone. The raw token exists only in the returned link: the database keeps its SHA-256.
 * The owner's own explicit consent is required by the form and the database stamps it server-side.
 */
export async function inviteContact(a: { name: string; email: string; phone: string | null; inviterName: string | null; baseUrl: string }): Promise<string> {
  if (PREVIEW) return inviteLink(a.baseUrl, 'P'.repeat(43));
  const { token, hash } = await newInviteToken();
  must(await getSupabase().from('trusted_contacts').insert({
    user_id: await uid(), name: a.name, email: a.email.trim().toLowerCase(), phone: a.phone, inviter_name: a.inviterName,
    invite_token_hash: hash, invite_expires_at: new Date().toISOString(), consented_at: new Date().toISOString(),
  }));
  return inviteLink(a.baseUrl, token);
}

export async function revokeContact(id: string): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('trusted_contacts').update({ status: 'revoked' }).eq('id', id));
}

export async function getCheckin(): Promise<Checkin> {
  if (PREVIEW) return { state: 'active', away_until: null, last_active_at: new Date().toISOString() };
  return must(await getSupabase().from('release_checkins').select('state,away_until,last_active_at').single());
}

/** "I'm okay": any activity resets the ladder. Called when the app opens. */
export async function recordActivity(): Promise<void> {
  if (PREVIEW) return;
  await getSupabase().rpc('record_activity');
}

export async function setAwayMode(days: number): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().rpc('set_away_mode', { p_days: days }));
}

export async function listAudit(): Promise<AuditEntry[]> {
  if (PREVIEW) return fx.audit;
  return must(await getSupabase().from('audit_log').select('id,actor,event,meta,created_at').order('created_at', { ascending: false }).limit(50));
}

// ---- the trusted person's side
export async function acceptInvite(token: string, action: 'check' | 'accept' | 'decline'): Promise<{ ok: boolean; error?: string; inviter_name?: string | null }> {
  if (PREVIEW) return { ok: true, inviter_name: 'Aisha' };
  const r = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/accept-invite`, {
    method: 'POST', headers: { 'content-type': 'application/json', apikey: process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '' }, body: JSON.stringify({ token, action }),
  });
  return await r.json().catch(() => ({ ok: false, error: 'error' }));
}

export async function contactCases(): Promise<ContactCase[]> {
  if (PREVIEW) return fx.cases;
  return must(await getSupabase().rpc('contact_cases'));
}
export async function answerRelease(owner: string, answer: 'fine' | 'passed'): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().rpc('answer_release_check', { p_owner: owner, p_answer: answer }));
}
export async function withdrawAnswer(owner: string): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().rpc('withdraw_release_answer', { p_owner: owner }));
}
export async function registerForContact(owner: string): Promise<ContactRegister> {
  if (PREVIEW) return fx.contactRegister;
  return must(await getSupabase().rpc('get_register_for_contact', { p_owner: owner }));
}

/** Delete my account and everything in it (the delete-account function does the work). */
export async function deleteAccount(): Promise<void> {
  if (PREVIEW) return;
  const { error } = await getSupabase().functions.invoke('delete-account', { body: { confirm: 'delete' } });
  if (error) throw new Error('delete failed');
  await getSupabase().auth.signOut();
}

// ---- consents (launch checklist 6 and 17)
export async function listConsents(): Promise<{ kind: string; version: string }[]> {
  if (PREVIEW) return [];
  return must(await getSupabase().from('consents').select('kind,version'));
}

/** Record agreement to these kinds for this version. The time is set by the database. */
export async function acceptConsents(kinds: readonly ConsentKind[], version: string): Promise<void> {
  if (PREVIEW) return;
  const user_id = await uid();
  must(await getSupabase().from('consents').upsert(kinds.map((kind) => ({ user_id, kind, version })), { onConflict: 'user_id,kind,version', ignoreDuplicates: true }));
}
