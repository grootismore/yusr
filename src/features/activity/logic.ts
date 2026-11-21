export interface DayEntry { date: string; kind: 'expense' | 'income'; laari: number }
export interface DayTotal { spent: number; received: number }

/** What was spent and what came in on each day (integer laari), so a day's header can say how it went. */
export function totalsByDay(entries: readonly DayEntry[]): Map<string, DayTotal> {
  const out = new Map<string, DayTotal>();
  for (const e of entries) {
    const t = out.get(e.date) ?? { spent: 0, received: 0 };
    if (e.kind === 'expense') t.spent += e.laari; else t.received += e.laari;
    out.set(e.date, t);
  }
  return out;
}

/** The categories spent on in a month, biggest spend first, as the filter chips above the list. Rows without a category are left out. */
export function categoryChips(spend: readonly { category_id: string | null; laari: number }[], limit = 8): string[] {
  const by = new Map<string, number>();
  for (const s of spend) if (s.category_id) by.set(s.category_id, (by.get(s.category_id) ?? 0) + s.laari);
  return [...by].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, limit).map(([id]) => id);
}
