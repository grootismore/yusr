import { FunctionsHttpError } from '@supabase/supabase-js';
import { addMonths, monthStart, today } from '@/lib/dates';
import { toMvrLaari } from '@/lib/money';
import { type BudgetRow } from '@/lib/budget';
import { type Draft, compressReceipt } from '@/lib/receipt';
import { PREVIEW, getSupabase } from '@/lib/supabase';
import { getItem, setItem } from '@/lib/kv';
import * as fx from './preview';
import type { Category, Expense, NewExpense, Profile, ScanItemInput } from './types';
import type { Debt, DebtInput, DebtPayment } from '@/features/debts/types';
import type { Conversion, KeptIncome, SplitIncome } from '@/features/foreign/logic';
import { sumByMonth } from '@/features/trends/trend';
import type { GivingCommitment, GivingEntry, GivingKind } from '@/features/giving/logic';
import type { Household, HouseholdEntry, HouseholdEntryInput, HouseholdMember } from '@/features/household/logic';
import type { MoneyPool, PoolInput, PoolPayment } from '@/features/pools/logic';
import type { SplitData, SplitType } from '@/features/split/logic';
import type { RecurringInput, RecurringItem, RecurringRun } from '@/features/recurring/logic';
import { inviteLink, newInviteToken } from '@/features/register/invite';
import type { ConsentKind } from '@/features/legal/consent';
import type { AuditEntry, Checkin, ContactCase, ContactRegister, RegisterItem, RegisterKind, TrustedContact } from '@/features/register/types';

async function uid(): Promise<string> {
  const { data } = await getSupabase().auth.getSession();
  if (!data.session) throw new Error('Not signed in');
  return data.session.user.id;
}

const isDup = (e: { code?: string; message?: string }): boolean => e.code === '23505' || /duplicate key/i.test(e.message ?? '');
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

export async function getExpense(id: string): Promise<Expense> {
  if (PREVIEW) return fx.expenses(monthStart()).find((e) => e.id === id) ?? fx.expenses(monthStart())[0];
  return must(await getSupabase().from('expenses').select('*').eq('id', id).single());
}

/** Change an expense the person entered wrongly. The MVR value is worked out by the database from amount and rate. */
export async function updateExpense({ id, e: input }: { id: string; e: NewExpense }): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('expenses').update({
    amount_laari: input.amount_laari, currency: input.currency, fx_rate_to_mvr: input.fx_rate_to_mvr, category_id: input.category_id,
    merchant: input.merchant, spent_at: input.spent_at, note: input.note,
  }).eq('id', id));
}

export async function deleteExpense(id: string): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('expenses').delete().eq('id', id));
}

/** The giving entry attached to an expense, if it is one (giving is an expense plus a sadaqah_entries row). */
export async function getSadaqah(expenseId: string): Promise<{ id: string; kind: GivingKind; recipient_note: string | null } | null> {
  if (PREVIEW) return null;
  return must(await getSupabase().from('sadaqah_entries').select('id,kind,recipient_note').eq('expense_id', expenseId).maybeSingle());
}

export async function updateSadaqah({ id, kind, recipient_note }: { id: string; kind: GivingKind; recipient_note: string | null }): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('sadaqah_entries').update({ kind, recipient_note }).eq('id', id));
}

export async function addExpense(input: NewExpense): Promise<void> {
  if (PREVIEW) return;
  const res = await getSupabase().from('expenses').insert({ ...input, user_id: await uid(), source: 'manual' });
  if (res.error && !isDup(res.error)) must(res);
}

export interface IncomeRow { id: string; amount_laari: number; currency: string; mvr_laari: number; received_at: string; note: string | null; fx_rate_to_mvr?: number; keep_in_currency?: boolean }

export async function listIncome(month: string): Promise<IncomeRow[]> {
  if (PREVIEW) return fx.income;
  return must(
    await getSupabase().from('income').select('id,amount_laari,currency,mvr_laari,received_at,note,fx_rate_to_mvr,keep_in_currency').gte('received_at', month).lt('received_at', addMonths(month, 1))
      .order('received_at', { ascending: false }).order('created_at', { ascending: false }),
  );
}

export async function addIncome(input: NewExpense): Promise<void> {
  if (PREVIEW) return;
  const res = await getSupabase().from('income').insert({
    id: input.id, user_id: await uid(), amount_laari: input.amount_laari, currency: input.currency, fx_rate_to_mvr: input.fx_rate_to_mvr, received_at: input.spent_at, note: input.note,
  });
  if (res.error && !isDup(res.error)) must(res);
}

/** Everything received in a foreign currency that was kept in it (all time), for the "held in USD" balance. */
export async function listKeptIncome(): Promise<KeptIncome[]> {
  if (PREVIEW) return fx.kept;
  const rows = must(await getSupabase().from('income').select('currency,amount_laari,mvr_laari').eq('keep_in_currency', true));
  return rows.map((r) => ({ currency: r.currency as string, amount_minor: r.amount_laari as number, mvr_laari: r.mvr_laari as number }));
}

export async function listConversions(): Promise<Conversion[]> {
  if (PREVIEW) return fx.conversions;
  return must(await getSupabase().from('conversions').select('id,currency,amount_minor,mvr_laari,converted_at,note').order('converted_at', { ascending: false }).order('created_at', { ascending: false }));
}

export async function addConversion(input: { currency: string; amount_minor: number; mvr_laari: number; converted_at: string; note: string | null }): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('conversions').insert({ ...input, user_id: await uid() }));
}

export async function deleteConversion(id: string): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('conversions').delete().eq('id', id));
}

/** A payday in more than one currency: one income row per line, all on the same day with the same note, saved together. */
export async function addIncomeSplit(input: { rows: SplitIncome[]; received_at: string; note: string | null; ids?: string[] }): Promise<void> {
  if (PREVIEW) return;
  const user_id = await uid();
  const res = await getSupabase().from('income').insert(input.rows.map((r, i) => ({ id: input.ids?.[i], user_id, amount_laari: r.amount_laari, currency: r.currency, fx_rate_to_mvr: r.fx_rate_to_mvr, keep_in_currency: r.keep_in_currency, received_at: input.received_at, note: input.note })));
  if (res.error && !isDup(res.error)) must(res);
}

export interface IncomeFull extends IncomeRow { fx_rate_to_mvr: number; keep_in_currency: boolean }

export async function getIncome(id: string): Promise<IncomeFull> {
  if (PREVIEW) return { ...fx.income[0], fx_rate_to_mvr: 1, keep_in_currency: false };
  return must(await getSupabase().from('income').select('id,amount_laari,currency,mvr_laari,received_at,note,fx_rate_to_mvr,keep_in_currency').eq('id', id).single());
}

export async function updateIncome({ id, e: input }: { id: string; e: NewExpense & { keep_in_currency: boolean } }): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('income').update({
    amount_laari: input.amount_laari, currency: input.currency, fx_rate_to_mvr: input.fx_rate_to_mvr, received_at: input.spent_at, note: input.note,
    keep_in_currency: input.currency !== 'MVR' && input.keep_in_currency,
  }).eq('id', id));
}

export async function deleteIncome(id: string): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('income').delete().eq('id', id));
}

export async function listBudgets(month: string): Promise<BudgetRow[]> {
  if (PREVIEW) return fx.budgets;
  return must(await getSupabase().from('budgets').select('id,month,category_id,limit_laari').lte('month', month));
}

/** Set the limit from `month` on. category null = the whole month. */
export async function setBudget({ month, categoryId, limit: limitLaari }: { month: string; categoryId: string | null; limit: number }): Promise<void> {
  if (PREVIEW) return;
  must(
    await getSupabase().from('budgets').upsert(
      { user_id: await uid(), month, category_id: categoryId, limit_laari: limitLaari },
      { onConflict: 'user_id,month,category_id' },
    ),
  );
}

/** Remove the limit entirely (every month's row for it). */
export async function clearBudget({ categoryId }: { categoryId: string | null }): Promise<void> {
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
  return must(await getSupabase().from('debt_payments').select('id,debt_id,amount_laari,paid_mvr_laari,paid_on,note,source,period').order('paid_on', { ascending: false }));
}

/** A new debt. The id is made on the phone, so sending it twice (after a lost reply) is still one debt. */
export async function addDebt({ id, input }: { id?: string; input: DebtInput }): Promise<void> {
  if (PREVIEW) return;
  const res = await getSupabase().from('debts').insert({ ...input, id, user_id: await uid() });
  if (res.error && !isDup(res.error)) must(res);
}

export async function updateDebt({ id, input }: { id: string; input: DebtInput }): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('debts').update(input).eq('id', id));
}

export async function deleteDebt(id: string): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('debts').delete().eq('id', id));
}

export async function addDebtPayment(p: { id?: string; debt_id: string; amount_laari: number; paid_mvr_laari?: number | null; paid_on: string; note: string | null; source?: 'manual' | 'auto'; period?: string }): Promise<void> {
  if (PREVIEW) return;
  const res = await getSupabase().from('debt_payments').insert({ ...p, user_id: await uid() });
  if (res.error && !isDup(res.error)) must(res);
}

export async function updateDebtPayment({ id, ...p }: { id: string; amount_laari: number; paid_mvr_laari?: number | null; paid_on: string; note: string | null }): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('debt_payments').update(p).eq('id', id));
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
    await getSupabase().from('sadaqah_entries').select('id,expense_id,kind,recipient_note,commitment_id,expenses!inner(mvr_laari,spent_at)')
      .gte('expenses.spent_at', month).lt('expenses.spent_at', addMonths(month, 1)),
  ) as unknown as { id: string; expense_id: string; kind: GivingKind; recipient_note: string | null; commitment_id: string | null; expenses: { mvr_laari: number; spent_at: string } }[];
  return rows.map((r) => ({ id: r.id, expense_id: r.expense_id, kind: r.kind, recipient_note: r.recipient_note, commitment_id: r.commitment_id, amount_laari: r.expenses.mvr_laari, spent_at: r.expenses.spent_at }))
    .sort((a, b) => (a.spent_at < b.spent_at ? 1 : -1));
}

/**
 * Giving is an ordinary expense in the Giving category plus a sadaqah_entries row, so the amount lives in one place.
 * ponytail: two inserts, not one transaction; if the second fails the expense is removed again.
 */
export async function logGiving(a: { amount_laari: number; kind: GivingKind; spent_at: string; recipient_note: string | null; commitment_id?: string; period?: string; id?: string }): Promise<void> {
  if (PREVIEW) return;
  const supabase = getSupabase();
  const user_id = await uid();
  const cat = must(await supabase.from('categories').select('id').eq('slug', 'giving').maybeSingle()) as { id: string } | null;
  const ins = await supabase.from('expenses').insert({ id: a.id, user_id, amount_laari: a.amount_laari, currency: 'MVR', fx_rate_to_mvr: 1, category_id: cat?.id ?? null, spent_at: a.spent_at, source: 'manual' }).select('id').single();
  // Sent before (a reply was lost): the expense is already there, so carry on to the entry rather than start again.
  if (ins.error && !(a.id && isDup(ins.error))) throw new Error(ins.error.message);
  const expenseId = (ins.data as { id: string } | null)?.id ?? (a.id as string);
  const r = await supabase.from('sadaqah_entries').insert({ user_id, expense_id: expenseId, kind: a.kind, recipient_note: a.recipient_note, commitment_id: a.commitment_id ?? null, period: a.period ?? null });
  if (r.error) {
    const mine = a.id ? (await supabase.from('sadaqah_entries').select('id').eq('expense_id', expenseId).maybeSingle()).data : null;
    if (mine) return; // this very entry was saved by an earlier try
    await supabase.from('expenses').delete().eq('id', expenseId);
    throw new Error(r.error.message);
  }
}

// ---- households: a shared account, and the one pot the members share
export async function getHousehold(): Promise<{ household: Household; members: HouseholdMember[] } | null> {
  if (PREVIEW) return fx.household;
  const supabase = getSupabase();
  const h = must(await supabase.from('households').select('id,name,mode').limit(1).maybeSingle()) as Household | null;
  if (!h) return null;
  const members = must(await supabase.from('household_members').select('user_id,display_name,role').eq('household_id', h.id).order('joined_at')) as HouseholdMember[];
  return { household: h, members };
}

// Members are added only through these database functions; the tables cannot be written directly.
export async function createHousehold({ name, displayName, mode = 'household' }: { name: string; displayName: string; mode?: 'couple' | 'household' }): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().rpc('create_household', { p_name: name, p_display_name: displayName }));
  if (mode === 'couple') must(await getSupabase().from('households').update({ mode }).eq('created_by', await uid()));
}
/** The owner switches between a couple (two people) and a household. */
export async function setHouseholdMode(mode: 'couple' | 'household'): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('households').update({ mode }).eq('created_by', await uid()));
}
export async function createHouseholdInvite(): Promise<string> {
  if (PREVIEW) return 'DEMO12345678';
  return must(await getSupabase().rpc('create_household_invite')) as string;
}
export async function joinHousehold({ code, displayName }: { code: string; displayName: string }): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().rpc('join_household', { p_code: code, p_display_name: displayName }));
}
// Leaving and removing are deletes of a membership row; row security allows only your own, or anyone's if you are the owner.
export async function leaveHousehold(): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('household_members').delete().eq('user_id', await uid()));
}
export async function removeHouseholdMember(userId: string): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('household_members').delete().eq('user_id', userId));
}

export async function listHouseholdEntries(month: string): Promise<HouseholdEntry[]> {
  if (PREVIEW) return fx.householdEntries;
  return must(
    await getSupabase().from('household_entries').select('id,household_id,user_id,kind,amount_laari,currency,fx_rate_to_mvr,mvr_laari,category_id,merchant,note,entry_date')
      .gte('entry_date', month).lt('entry_date', addMonths(month, 1)).order('entry_date', { ascending: false }).order('created_at', { ascending: false }),
  );
}

/** Add to the shared pot. The id is made on the phone, so sending it twice is still one entry. */
export async function addHouseholdEntry({ id, householdId, input }: { id?: string; householdId: string; input: HouseholdEntryInput; userId?: string }): Promise<void> {
  if (PREVIEW) return;
  const res = await getSupabase().from('household_entries').insert({ ...input, id, household_id: householdId, user_id: input.user_id ?? await uid() });
  if (res.error && !isDup(res.error)) must(res);
}
export async function updateHouseholdEntry({ id, input }: { id: string; input: HouseholdEntryInput }): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('household_entries').update(input).eq('id', id));
}
export async function deleteHouseholdEntry(id: string): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('household_entries').delete().eq('id', id));
}

// ---- recurring expenses and income
export async function listRecurring(): Promise<RecurringItem[]> {
  if (PREVIEW) return fx.recurring;
  return must(await getSupabase().from('recurring_items').select('id,user_id,household_id,for_user,kind,name,note,amount_minor,currency,category_id,every,starts_on,ended_on,auto_add').order('created_at', { ascending: true }));
}

export async function listRecurringRuns(): Promise<RecurringRun[]> {
  if (PREVIEW) return [];
  return must(await getSupabase().from('recurring_runs').select('id,recurring_id,occurrence,expense_id,income_id,household_entry_id,skipped'));
}

export async function addRecurring({ id, input }: { id?: string; input: RecurringInput }): Promise<void> {
  if (PREVIEW) return;
  const res = await getSupabase().from('recurring_items').insert({ ...input, id, user_id: await uid() });
  if (res.error && !isDup(res.error)) must(res);
}

export async function updateRecurring({ id, input }: { id: string; input: RecurringInput }): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('recurring_items').update(input).eq('id', id));
}

/** Stopping keeps everything already recorded; it only ends the item. */
export async function endRecurring(id: string): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('recurring_items').update({ ended_on: today() }).eq('id', id));
}

/** Leave one date out (the tenant did not pay this month): it is marked dealt with and nothing is recorded. */
export async function skipRecurring({ recurring_id, occurrence }: { recurring_id: string; occurrence: string }): Promise<void> {
  if (PREVIEW) return;
  const res = await getSupabase().from('recurring_runs').insert({ user_id: await uid(), recurring_id, occurrence, skipped: true });
  if (res.error && !isDup(res.error)) must(res);
}

/** Say an existing expense or income already covers one date of a recurring item, so that date is not added again. */
export async function linkRecurringRun({ recurring_id, occurrence, expense_id, income_id }: { recurring_id: string; occurrence: string; expense_id?: string; income_id?: string }): Promise<void> {
  if (PREVIEW) return;
  const res = await getSupabase().from('recurring_runs').insert({ user_id: await uid(), recurring_id, occurrence, expense_id: expense_id ?? null, income_id: income_id ?? null });
  if (res.error && !isDup(res.error)) must(res);
}

/**
 * Record one date of a recurring item: an ordinary expense or income row, plus the run row that says this date is done.
 * Safe to send twice (the id is made on the phone), and if another phone got there first the extra row is removed.
 */
export async function logRecurring(a: { id?: string; recurring_id: string; occurrence: string; kind: 'expense' | 'income'; name: string; amount_minor: number; currency: string; fx_rate_to_mvr: string; category_id: string | null; household?: { id: string; user_id?: string } }): Promise<void> {
  if (PREVIEW) return;
  const supabase = getSupabase();
  const user_id = await uid();
  const table = a.household ? 'household_entries' : a.kind === 'expense' ? 'expenses' : 'income';
  const row: Record<string, unknown> = a.household
    ? { id: a.id, household_id: a.household.id, user_id: a.household.user_id ?? user_id, kind: a.kind, amount_laari: a.amount_minor, currency: a.currency, fx_rate_to_mvr: a.fx_rate_to_mvr, category_id: a.kind === 'expense' ? a.category_id : null, merchant: a.kind === 'expense' ? a.name : null, note: a.kind === 'income' ? a.name : null, entry_date: a.occurrence }
    : a.kind === 'expense'
    ? { id: a.id, user_id, amount_laari: a.amount_minor, currency: a.currency, fx_rate_to_mvr: a.fx_rate_to_mvr, category_id: a.category_id, merchant: a.name, spent_at: a.occurrence, source: 'manual' }
    : { id: a.id, user_id, amount_laari: a.amount_minor, currency: a.currency, fx_rate_to_mvr: a.fx_rate_to_mvr, received_at: a.occurrence, note: a.name };
  const ins = await supabase.from(table).insert(row);
  if (ins.error && !(a.id && isDup(ins.error))) throw new Error(ins.error.message);
  const run = await supabase.from('recurring_runs').insert({ user_id, recurring_id: a.recurring_id, occurrence: a.occurrence, expense_id: !a.household && a.kind === 'expense' ? a.id : null, income_id: !a.household && a.kind === 'income' ? a.id : null, household_entry_id: a.household ? a.id : null });
  if (run.error) {
    const mine = a.id ? (await supabase.from('recurring_runs').select('id').eq('recurring_id', a.recurring_id).eq('occurrence', a.occurrence).eq(a.household ? 'household_entry_id' : a.kind === 'expense' ? 'expense_id' : 'income_id', a.id).maybeSingle()).data : null;
    if (mine) return; // this very row was recorded by an earlier try
    await supabase.from(table).delete().eq('id', a.id as string); // another phone recorded this date first
    if (isDup(run.error)) return;
    throw new Error(run.error.message);
  }
}

// ---- Split: sharing costs with friends
export async function listSplit(): Promise<SplitData> {
  if (PREVIEW) return fx.split;
  const supabase = getSupabase();
  const [groups, people, expenses, shares, settlements] = await Promise.all([
    supabase.from('split_groups').select('id,name,currency,archived').order('created_at', { ascending: false }),
    supabase.from('split_people').select('id,group_id,name,is_me').order('created_at', { ascending: true }),
    supabase.from('split_expenses').select('id,group_id,description,amount_minor,paid_by,split_type,spent_on,note').order('spent_on', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('split_shares').select('expense_id,person_id,share_minor'),
    supabase.from('split_settlements').select('id,group_id,from_person,to_person,amount_minor,settled_on,note').order('settled_on', { ascending: false }),
  ]);
  return { groups: must(groups), people: must(people), expenses: must(expenses) as SplitData['expenses'], shares: must(shares), settlements: must(settlements) };
}

/** Rows are inserted with ids made on the phone, so every one of these is safe to send twice. */
const insertOnce = async (table: string, rows: Record<string, unknown> | Record<string, unknown>[]): Promise<void> => {
  const res = await getSupabase().from(table).insert(rows as never);
  if (res.error && !isDup(res.error)) throw new Error(res.error.message);
};

export async function addSplitGroup(a: { id?: string; name: string; currency: string; people: { id: string; name: string; is_me: boolean }[] }): Promise<void> {
  if (PREVIEW) return;
  const user_id = await uid();
  await insertOnce('split_groups', { id: a.id, user_id, name: a.name, currency: a.currency });
  await insertOnce('split_people', a.people.map((p) => ({ id: p.id, user_id, group_id: a.id, name: p.name, is_me: p.is_me })));
}
export async function addSplitPerson(a: { id?: string; group_id: string; name: string }): Promise<void> {
  if (PREVIEW) return;
  await insertOnce('split_people', { id: a.id, user_id: await uid(), group_id: a.group_id, name: a.name, is_me: false });
}
export async function addSplitExpense(a: { id?: string; group_id: string; description: string; amount_minor: number; paid_by: string; split_type: SplitType; spent_on: string; note: string | null; shares: Record<string, number> }): Promise<void> {
  if (PREVIEW) return;
  const user_id = await uid();
  await insertOnce('split_expenses', { id: a.id, user_id, group_id: a.group_id, description: a.description, amount_minor: a.amount_minor, paid_by: a.paid_by, split_type: a.split_type, spent_on: a.spent_on, note: a.note });
  const rows = Object.entries(a.shares).map(([person_id, share_minor]) => ({ expense_id: a.id, person_id, group_id: a.group_id, user_id, share_minor }));
  const res = await getSupabase().from('split_shares').upsert(rows as never, { onConflict: 'expense_id,person_id', ignoreDuplicates: true });
  if (res.error) throw new Error(res.error.message);
}
export async function addSplitSettlement(a: { id?: string; group_id: string; from_person: string; to_person: string; amount_minor: number; settled_on: string; note: string | null }): Promise<void> {
  if (PREVIEW) return;
  await insertOnce('split_settlements', { ...a, user_id: await uid() });
}
export async function deleteSplitExpense(id: string): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('split_expenses').delete().eq('id', id));
}
export async function deleteSplitSettlement(id: string): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('split_settlements').delete().eq('id', id));
}
export async function deleteSplitGroup(id: string): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('split_groups').delete().eq('id', id));
}

// ---- money pools
export async function listPools(): Promise<MoneyPool[]> {
  if (PREVIEW) return fx.pools;
  return must(await getSupabase().from('money_pools').select('id,user_id,household_id,for_user,name,note,amount_minor,currency,due_day,members,payout_month,payout_received,started_on,ended_on').order('created_at', { ascending: true }));
}

export async function listPoolPayments(): Promise<PoolPayment[]> {
  if (PREVIEW) return [];
  return must(await getSupabase().from('pool_payments').select('id,pool_id,expense_id,period'));
}

export async function addPool({ id, input }: { id?: string; input: PoolInput }): Promise<void> {
  if (PREVIEW) return;
  const res = await getSupabase().from('money_pools').insert({ ...input, id, user_id: await uid() });
  if (res.error && !isDup(res.error)) must(res);
}

export async function updatePool({ id, input }: { id: string; input: PoolInput }): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('money_pools').update(input).eq('id', id));
}

/** Stopping keeps what was already paid; it only ends the pool. */
export async function endPool(id: string): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('money_pools').update({ ended_on: today() }).eq('id', id));
}

/**
 * One month's contribution: an ordinary expense in the Money pool category plus a row saying which pool and month it
 * is for. Safe to send twice (the ids are made on the phone, and a month can be paid once).
 */
export async function logPoolPayment(a: { id?: string; pool_id: string; name: string; amount_minor: number; currency: string; fx_rate_to_mvr: string; spent_at: string; period: string }): Promise<void> {
  if (PREVIEW) return;
  const supabase = getSupabase();
  const user_id = await uid();
  const cat = must(await supabase.from('categories').select('id').eq('slug', 'money-pool').maybeSingle()) as { id: string } | null;
  const ins = await supabase.from('expenses').insert({ id: a.id, user_id, amount_laari: a.amount_minor, currency: a.currency, fx_rate_to_mvr: a.fx_rate_to_mvr, category_id: cat?.id ?? null, merchant: a.name, spent_at: a.spent_at, source: 'manual' }).select('id').single();
  if (ins.error && !(a.id && isDup(ins.error))) throw new Error(ins.error.message);
  const expenseId = (ins.data as { id: string } | null)?.id ?? (a.id as string);
  const r = await supabase.from('pool_payments').insert({ user_id, pool_id: a.pool_id, expense_id: expenseId, period: a.period });
  if (r.error) {
    const mine = a.id ? (await supabase.from('pool_payments').select('id').eq('expense_id', expenseId).maybeSingle()).data : null;
    if (mine) return;
    await supabase.from('expenses').delete().eq('id', expenseId);
    throw new Error(r.error.message);
  }
}

export async function listCommitments(): Promise<GivingCommitment[]> {
  if (PREVIEW) return [];
  return must(await getSupabase().from('giving_commitments').select('id,user_id,household_id,for_user,recipient,note,amount_laari,kind,due_day,started_on,ended_on').order('created_at', { ascending: true }));
}

/** Which commitments have been paid for a month by anyone in the household (a shared one may be paid by the partner). */
export async function listPaidCommitments(month: string): Promise<string[]> {
  if (PREVIEW) return [];
  const rows = must(await getSupabase().from('sadaqah_entries').select('commitment_id').eq('period', month).not('commitment_id', 'is', null)) as { commitment_id: string }[];
  return rows.map((r) => r.commitment_id);
}

export type CommitmentInput = Pick<GivingCommitment, 'recipient' | 'note' | 'amount_laari' | 'kind' | 'due_day' | 'household_id' | 'for_user'>;
export async function saveCommitment(a: { input: CommitmentInput; id?: string }): Promise<void> {
  if (PREVIEW) return;
  const supabase = getSupabase();
  if (a.id) must(await supabase.from('giving_commitments').update(a.input).eq('id', a.id));
  else must(await supabase.from('giving_commitments').insert({ ...a.input, user_id: await uid() }));
}

/** Stopping keeps what was already paid; it only ends the commitment. */
export async function endCommitment(id: string): Promise<void> {
  if (PREVIEW) return;
  must(await getSupabase().from('giving_commitments').update({ ended_on: today() }).eq('id', id));
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

// ---- spending trend (Reports)
/** Pages through all rows (the API returns at most 1000 at a time) so a busy few months is never cut short. */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const rows = must(await page(from, from + 999)) ?? [];
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

/** Per-month spending and income in MVR laari for the given months (oldest first). */
export async function monthlyTotals(months: string[]): Promise<{ spend: number[]; income: number[] }> {
  if (PREVIEW) return fx.trend(months);
  const supabase = getSupabase();
  const from = months[0];
  const to = addMonths(months[months.length - 1], 1);
  const [spendRows, incomeRows] = await Promise.all([
    fetchAll<{ mvr_laari: number; spent_at: string }>((a, b) => supabase.from('expenses').select('mvr_laari,spent_at').gte('spent_at', from).lt('spent_at', to).order('spent_at').range(a, b)),
    fetchAll<{ mvr_laari: number; received_at: string }>((a, b) => supabase.from('income').select('mvr_laari,received_at').gte('received_at', from).lt('received_at', to).order('received_at').range(a, b)),
  ]);
  return {
    spend: sumByMonth(spendRows.map((r) => ({ date: r.spent_at, laari: r.mvr_laari })), months),
    income: sumByMonth(incomeRows.map((r) => ({ date: r.received_at, laari: r.mvr_laari })), months),
  };
}
