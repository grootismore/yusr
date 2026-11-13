export interface Category { id: string; user_id: string | null; slug: string | null; name_dv: string; name_en: string; icon: string }
export interface Expense {
  id: string; amount_laari: number; currency: string; fx_rate_to_mvr: number; mvr_laari: number; category_id: string | null;
  merchant: string | null; spent_at: string; note: string | null; source: 'manual' | 'scan'; receipt_id: string | null;
}
export interface NewExpense {
  amount_laari: number; currency: string; fx_rate_to_mvr: string; category_id: string | null; merchant: string | null;
  spent_at: string; note: string | null;
}
export interface Profile { language: 'dv' | 'en'; base_currency: string; keep_receipt_images: boolean }
export interface ScanItemInput { name: string; qty: number; total_laari: number }
