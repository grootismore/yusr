/** Geometry for the charts. Pure, so it is tested without drawing anything. */

/** The most slices a donut shows; everything smaller is folded into one "other" slice. */
export const MAX_SLICES = 6;

/** Sorted amounts as shares of the whole: the biggest MAX_SLICES-1 on their own, the rest together as `other`. */
export function sliceShares<K>(rows: readonly (readonly [K, number])[]): { key: K | 'other'; value: number; percent: number }[] {
  const sorted = rows.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((s, [, v]) => s + v, 0);
  if (total === 0) return [];
  const head = sorted.length > MAX_SLICES ? sorted.slice(0, MAX_SLICES - 1) : sorted;
  const rest = sorted.slice(head.length).reduce((s, [, v]) => s + v, 0);
  const out: { key: K | 'other'; value: number }[] = head.map(([key, value]) => ({ key, value }));
  if (rest > 0) out.push({ key: 'other', value: rest });
  return out.map((o) => ({ ...o, percent: Math.round((o.value * 100) / total) }));
}

/** Start and length of each slice along a circle of the given circumference, with a small gap between slices. */
export function arcs(values: readonly number[], circumference: number, gap = 3): { start: number; length: number }[] {
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0) return [];
  const g = values.length > 1 ? gap : 0;
  let at = 0;
  return values.map((v) => {
    const span = (v / total) * circumference;
    const arc = { start: at, length: Math.max(0.5, span - g) };
    at += span;
    return arc;
  });
}

/** A smooth SVG path through the points (Catmull-Rom turned into Bézier curves, kept from overshooting below the baseline). */
export function smoothPath(points: readonly { x: number; y: number }[], floor: number): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i], p1 = points[i], p2 = points[i + 1], p3 = points[i + 2] ?? p2;
    const c1y = Math.min(floor, p1.y + (p2.y - p0.y) / 6), c2y = Math.min(floor, p2.y - (p3.y - p1.y) / 6);
    d += ` C${p1.x + (p2.x - p0.x) / 6},${c1y} ${p2.x - (p3.x - p1.x) / 6},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}
