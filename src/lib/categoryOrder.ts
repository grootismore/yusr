/**
 * The categories with the ones you use most first, so the one you want is usually at the top and the rest keep their
 * usual order. Only categories you have actually used move; "no category" spending is ignored.
 */
export function categoriesByUse<C extends { id: string }>(categories: readonly C[], spending: readonly { category_id: string | null }[]): C[] {
  const uses = new Map<string, number>();
  for (const s of spending) if (s.category_id) uses.set(s.category_id, (uses.get(s.category_id) ?? 0) + 1);
  return categories
    .map((c, i) => ({ c, i, n: uses.get(c.id) ?? 0 }))
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .map((x) => x.c);
}
