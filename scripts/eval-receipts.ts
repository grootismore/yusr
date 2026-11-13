// Run the scanner over real receipt photos and report field accuracy and cost per scan.
//
//   GEMINI_API_KEY=... node --experimental-strip-types scripts/eval-receipts.ts <folder> [--model a --model b] [--out report.json]
//
// <folder> holds photos (jpg/png/webp) and, next to each, a ground-truth file with the same name + .json:
//   { "merchant": "STO Mart", "date": "2026-11-03", "currency": "MVR", "total": "108.00",
//     "gst": "8.00" | null, "category": "food-groceries", "items_count": 2 }
// Every key is optional; only the keys you give are scored. Receipts never leave your machine except to Gemini.
// Use photos compressed like the app will (about 200-400 KB) so cost and accuracy match production.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { DEFAULT_MODEL, PRICES_USD_PER_M } from '../supabase/functions/scan-receipt/config.ts';
import { callGemini } from '../supabase/functions/scan-receipt/gemini.ts';
import { buildDraft, parseMoney } from '../supabase/functions/scan-receipt/logic.ts';

const args = process.argv.slice(2);
const flag = (name: string) => args.flatMap((a, i) => (a === name ? [args[i + 1]] : []));
const dir = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
const models = flag('--model').length ? flag('--model') : [DEFAULT_MODEL];
const out = flag('--out')[0];
const apiKey = process.env.GEMINI_API_KEY;
if (!dir || !apiKey) { console.error('usage: GEMINI_API_KEY=... eval-receipts.ts <folder> [--model m] [--out file]'); process.exit(1); }

const MIME: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const norm = (s: unknown) => String(s ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
const files = (await readdir(dir)).filter((f) => MIME[extname(f).toLowerCase()]).sort();

type Row = { file: string; ok: boolean; flagged: boolean; ms: number; inTok: number; outTok: number; hits: Record<string, boolean> };

async function run(model: string) {
  const rows: Row[] = [];
  let next = 0;
  const worker = async () => {
    while (next < files.length) {
      const file = files[next++];
      const truth = await readFile(join(dir!, basename(file, extname(file)) + '.json'), 'utf8').then(JSON.parse, () => null);
      const t0 = Date.now();
      const row: Row = { file, ok: false, flagged: false, ms: 0, inTok: 0, outTok: 0, hits: {} };
      try {
        const r = await callGemini({ apiKey: apiKey!, model, mimeType: MIME[extname(file).toLowerCase()], image: await readFile(join(dir!, file)) });
        row.inTok = r.inputTokens; row.outTok = r.outputTokens;
        const o = buildDraft(r.raw);
        const d = o.draft;
        row.ok = o.ok; row.flagged = !!d?.totals_mismatch;
        if (truth && d) {
          const h = row.hits;
          if ('merchant' in truth) h.merchant = !!d.merchant && (norm(d.merchant) === norm(truth.merchant) || norm(d.merchant).includes(norm(truth.merchant)) || norm(truth.merchant).includes(norm(d.merchant)));
          if ('date' in truth) h.date = d.date === truth.date;
          if ('currency' in truth) h.currency = d.currency === truth.currency;
          if ('total' in truth) h.total = d.total_laari === parseMoney(truth.total);
          if ('gst' in truth) h.gst = d.gst_laari === (truth.gst === null ? null : parseMoney(truth.gst));
          if ('category' in truth) h.category = d.category_slug === truth.category;
          if ('items_count' in truth) h.items_count = d.items.length === truth.items_count;
        } else if (truth) for (const k of Object.keys(truth)) row.hits[k] = false;
      } catch (e) { console.error(`${model} ${file}: ${(e as Error).message}`); }
      row.ms = Date.now() - t0;
      rows.push(row);
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  return rows;
}

const report: Record<string, unknown> = {};
for (const model of models) {
  const rows = await run(model);
  const price = PRICES_USD_PER_M[model];
  const cost = (r: Row) => (price ? (r.inTok * price.input + r.outTok * price.output) / 1e6 : NaN);
  const fields = [...new Set(rows.flatMap((r) => Object.keys(r.hits)))];
  const acc = Object.fromEntries(fields.map((f) => {
    const scored = rows.filter((r) => f in r.hits);
    return [f, `${((100 * scored.filter((r) => r.hits[f]).length) / scored.length).toFixed(1)}% (${scored.length})`];
  }));
  const avg = (f: (r: Row) => number) => rows.reduce((a, r) => a + f(r), 0) / rows.length;
  const clean = rows.filter((r) => Object.values(r.hits).length && Object.values(r.hits).every(Boolean)).length;
  const s = {
    model, receipts: rows.length, readable: rows.filter((r) => r.ok).length, flagged_mismatch: rows.filter((r) => r.flagged).length,
    accuracy: acc, all_scored_fields_right: clean,
    avg_input_tokens: Math.round(avg((r) => r.inTok)), avg_output_tokens: Math.round(avg((r) => r.outTok)),
    cost_per_scan_usd: price ? Number(avg(cost).toFixed(5)) : 'add model to PRICES_USD_PER_M in config.ts',
    avg_seconds: Number((avg((r) => r.ms) / 1000).toFixed(1)),
  };
  report[model] = s;
  console.log(JSON.stringify(s, null, 2));
}
if (out) await writeFile(out, JSON.stringify(report, null, 2));
