import { FunctionsHttpError } from '@supabase/supabase-js';
import { addMonths } from '@/lib/dates';
import { toMvrLaari } from '@/lib/money';
import { type BudgetRow } from '@/lib/budget';
import { type Draft, compressReceipt } from '@/lib/receipt';
import { PREVIEW, getSupabase } from '@/lib/supabase';
import { getItem, setItem } from '@/lib/kv';
import * as fx from './preview';
import type { Category, Expense, NewExpense, Profile, ScanItemInput } from './types';

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
