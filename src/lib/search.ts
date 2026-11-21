/**
 * Does something match what was typed? Words match anywhere in the text without regard to case. A typed number matches an
 * amount: parts that are numbers are laari, so "2377" or "2,377.76" finds MVR 2,377.76.
 */
export function matchesSearch(query: string, parts: readonly (string | number | null | undefined)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const typed = q.replace(/[,\s]/g, '');
  const isNumber = /^\d+(\.\d+)?$/.test(typed);
  return parts.some((p) => {
    if (p === null || p === undefined) return false;
    if (typeof p === 'number') return isNumber && (p / 100).toFixed(2).replace(/\.00$/, '').includes(typed.replace(/\.0+$/, ''));
    return p.toLowerCase().includes(q);
  });
}
