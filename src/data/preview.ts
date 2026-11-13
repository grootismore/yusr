// Fixture data for the web preview (EXPO_PUBLIC_PREVIEW=1) used to check layouts and screenshots. Never in builds.
import { addMonths, today } from '@/lib/dates';
import type { BudgetRow } from '@/lib/budget';
import type { Category, Expense } from './types';

// ---- debts (preview)
import type { Debt, DebtPayment } from '@/features/debts/types';

// ---- giving (preview)
import type { GivingEntry } from '@/features/giving/logic';

// ---- register (preview)
import type { AuditEntry, ContactCase, ContactRegister, RegisterItem, TrustedContact } from '@/features/register/types';

// ---- income (preview)
import type { IncomeRow } from './api';

const cat = (slug: string, name_en: string, name_dv: string, icon: string): Category => ({ id: slug, user_id: null, slug, name_en, name_dv, icon });
export const categories: Category[] = [
  cat('food-groceries', 'Food and groceries', 'ކާބޯތަކެތި', 'cart'), cat('transport', 'Transport', 'ދަތުރުފަތުރު', 'boat'),
  cat('bills', 'Bills', 'ބިލްތައް', 'flash'), cat('rent', 'Rent', 'ކުލި', 'home'), cat('health', 'Health', 'ސިއްހަތު', 'medkit'),
  cat('education', 'Education', 'ތައުލީމު', 'school'), cat('shopping', 'Shopping', 'ޝޮޕިންގ', 'bag'),
  cat('family-support', 'Family support', 'ޢާއިލާއަށް އެހީތެރިވުން', 'people'), cat('giving', 'Giving', 'ދިނުން', 'gift'), cat('other', 'Other', 'އެހެނިހެން', 'ellipsis'),
];

const e = (i: number, amount: number, category: string, merchant: string, day: number, source: 'manual' | 'scan' = 'manual', currency = 'MVR', rate = 1): Omit<Expense, 'spent_at'> & { day: number } => ({
  id: `e${i}`, amount_laari: amount, currency, fx_rate_to_mvr: rate, mvr_laari: Math.round(amount * rate), category_id: category, merchant, day, note: null, source, receipt_id: source === 'scan' ? `r${i}` : null,
});
const rows = [
  e(1, 184550, 'food-groceries', 'STO Mart', 2, 'scan'), e(2, 450000, 'rent', 'ކުލި — Villa Nasandhura', 1), e(3, 62000, 'bills', 'STELCO', 3),
  e(4, 14500, 'transport', 'Ferry · ފެރީ', 4), e(5, 96000, 'food-groceries', 'Fantasea', 5, 'scan'), e(6, 20000, 'giving', 'Sadaqah', 6),
  e(7, 15420, 'shopping', 'Amazon', 7, 'manual', 'USD', 15.42), e(8, 38000, 'health', 'ޑީއާރް ޒުބައިރު Clinic', 8),
];
export const expenses = (month: string): Expense[] => {
  return rows.map(({ day, ...r }) => ({ ...r, spent_at: `${month.slice(0, 8)}${String(Math.min(day, 28)).padStart(2, '0')}` })) as Expense[];
};
export const budgets: BudgetRow[] = [
  { id: 'b0', month: addMonths(today().slice(0, 7) + '-01', -1), category_id: null, limit_laari: 1_200_000 },
  { id: 'b1', month: addMonths(today().slice(0, 7) + '-01', -1), category_id: 'food-groceries', limit_laari: 250_000 },
  { id: 'b2', month: addMonths(today().slice(0, 7) + '-01', -1), category_id: 'transport', limit_laari: 16_000 },
];
export const debts: Debt[] = [
  { id: 'd1', lender: 'BML · Personal loan', kind: 'loan', opening_balance_laari: 6_000_000, balance_laari: 4_500_000, paid_laari: 1_500_000, min_payment_laari: 250_000, due_day: 10, interest_bearing: true, interest_rate_bps: 1250, started_on: '2026-01-05', in_register: true, notes: null },
  { id: 'd2', lender: 'Ahmed (brother)', kind: 'qard_hasan', opening_balance_laari: 1_000_000, balance_laari: 800_000, paid_laari: 200_000, min_payment_laari: 50_000, due_day: 28, interest_bearing: false, interest_rate_bps: null, started_on: null, in_register: true, notes: null },
  { id: 'd3', lender: 'ޑީއާރް ކްރެޑިޓް ކާޑު', kind: 'credit_card', opening_balance_laari: 450_000, balance_laari: 450_000, paid_laari: 0, min_payment_laari: 45_000, due_day: 16, interest_bearing: true, interest_rate_bps: 3600, started_on: null, in_register: false, notes: null },
];
export const debtPayments: DebtPayment[] = [
  { id: 'p1', debt_id: 'd1', amount_laari: 250_000, paid_on: '2026-10-10', note: null },
  { id: 'p2', debt_id: 'd1', amount_laari: 250_000, paid_on: '2026-09-10', note: 'Salary day' },
  { id: 'p3', debt_id: 'd2', amount_laari: 50_000, paid_on: '2026-10-28', note: null },
];
export const giving: GivingEntry[] = [
  { id: 'g1', expense_id: 'e6', kind: 'sadaqah', recipient_note: 'Masjid fund', amount_laari: 20_000, spent_at: '2026-11-06' },
  { id: 'g2', expense_id: 'e9', kind: 'jariyah', recipient_note: null, amount_laari: 10_000, spent_at: '2026-11-03' },
  { id: 'g3', expense_id: 'e10', kind: 'zakat', recipient_note: 'ޢާއިލާ', amount_laari: 150_000, spent_at: '2026-11-02' },
];
export const registerItems: RegisterItem[] = [
  { id: 'r1', kind: 'receivable', title: 'Owed by Ali', counterparty: 'Ali', amount_laari: 150_000 },
  { id: 'r2', kind: 'wish', title: 'Wish for the family', counterparty: null, amount_laari: null },
  { id: 'r3', kind: 'giving', title: 'Pending sadaqah', counterparty: 'Masjid', amount_laari: 50_000 },
];
export const contacts: TrustedContact[] = [
  { id: 'k1', name: 'Fathimath', email: 'fathimath@example.com', status: 'accepted', inviter_name: 'Aisha', invite_expires_at: '2026-11-20T00:00:00Z' },
  { id: 'k2', name: 'ޢަލީ', email: 'ali@example.com', status: 'invited', inviter_name: 'Aisha', invite_expires_at: '2026-11-20T00:00:00Z' },
];
export const audit: AuditEntry[] = [
  { id: 'a1', actor: 'user', event: 'register_item_changed', meta: {}, created_at: '2026-11-12T08:00:00Z' },
  { id: 'a2', actor: 'contact', event: 'contact_accepted', meta: {}, created_at: '2026-11-11T09:30:00Z' },
  { id: 'a3', actor: 'user', event: 'contact_invited', meta: {}, created_at: '2026-11-10T09:00:00Z' },
];
export const cases: ContactCase[] = [
  { owner_id: 'o1', inviter_name: 'Aisha', state: 'contacts_asked', my_answer: null },
  { owner_id: 'o2', inviter_name: 'Hassan', state: 'released', my_answer: 'passed' },
];
export const contactRegister: ContactRegister = {
  items: [{ kind: 'receivable', title: 'Owed by Ali', counterparty: 'Ali', amount_laari: 150_000, details: 'Call him first.' }, { kind: 'wish', title: 'Wish', counterparty: null, amount_laari: null, details: null }],
  debts: [{ lender: 'BML · Personal loan', kind: 'loan', balance_laari: 4_500_000 }],
};
export const income: IncomeRow[] = [
  { id: 'i1', amount_laari: 1_800_000, currency: 'MVR', mvr_laari: 1_800_000, received_at: '2026-11-01', note: 'Salary' },
  { id: 'i2', amount_laari: 250_000, currency: 'MVR', mvr_laari: 250_000, received_at: '2026-11-08', note: 'ޓިއުޝަން' },
];
