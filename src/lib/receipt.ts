import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Draft returned by the scan-receipt function (amounts are integer laari, date is YYYY-MM-DD). */
export interface Confidence { merchant: number; date: number; currency: number; total: number; gst: number; items: number; category: number }
export interface DraftItem { name: string; qty: number; unit_price_laari: number | null; total_laari: number }
export interface Draft {
  merchant: string | null; date: string | null; currency: string; total_laari: number | null; gst_laari: number | null;
  service_charge_laari: number | null; discount_laari: number | null; prices_include_gst: boolean | null;
  items: DraftItem[]; category_slug: string; confidence: Confidence; totals_mismatch: boolean;
  items_sum_laari: number; expected_total_laari: number | null; warnings: string[];
}

/** Below this the confirm screen asks the user to check the field. */
export const LOW_CONFIDENCE = 0.7;
export const isLow = (c: number): boolean => c < LOW_CONFIDENCE;

const TOLERANCE = 5; // laari of rounding drift

export interface TotalsCheck { match: boolean; itemsSum: number; expected: number }

/**
 * Items (+ service charge - discount) plus GST should equal the total. When the receipt does not
 * say whether prices include GST, either reading counts as a match. Same rule as the server.
 */
export function checkTotals(a: { items: number[]; gst: number; service: number; discount: number; total: number; includesGst: boolean | null }): TotalsCheck {
  const itemsSum = a.items.reduce((s, n) => s + n, 0);
  const base = itemsSum + a.service - a.discount;
  const onTop = base + a.gst;
  const near = (x: number) => Math.abs(x - a.total) <= TOLERANCE;
  if (a.includesGst === true) return { match: near(base), itemsSum, expected: base };
  if (a.includesGst === false) return { match: near(onTop), itemsSum, expected: onTop };
  return { match: near(base) || near(onTop), itemsSum, expected: onTop };
}

const TARGET_MAX_BYTES = 400 * 1024;
const WIDTHS = [1280, 1024, 800];
const QUALITIES = [0.7, 0.55, 0.4];

/**
 * Shrink a receipt photo on the device before upload: about 200-400 KB. Tries a few size and
 * quality steps and returns the first that fits, or the smallest it managed.
 */
export async function compressReceipt(uri: string): Promise<{ uri: string; bytes: number }> {
  let best: { uri: string; bytes: number } | undefined;
  for (let i = 0; i < WIDTHS.length; i++) {
    const ref = await ImageManipulator.manipulate(uri).resize({ width: WIDTHS[i] }).renderAsync();
    const out = await ref.saveAsync({ format: SaveFormat.JPEG, compress: QUALITIES[i] });
    const bytes = (await (await fetch(out.uri)).blob()).size;
    if (!best || bytes < best.bytes) best = { uri: out.uri, bytes };
    if (bytes <= TARGET_MAX_BYTES) break;
  }
  return best!;
}
