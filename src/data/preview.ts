// Fixture data for the web preview (EXPO_PUBLIC_PREVIEW=1) used to check layouts and screenshots. Never in builds.
import { addMonths, today } from '@/lib/dates';
import type { BudgetRow } from '@/lib/budget';
import type { Category, Expense } from './types';

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
