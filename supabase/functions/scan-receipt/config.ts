// The one place the scanner is configured. The model name lives here and nowhere else;
// override per environment with the GEMINI_MODEL secret, or per run with eval-receipts --model.

/** Cheapest Flash-Lite-class vision model that works. Confirm with scripts/eval-receipts.ts. */
export const DEFAULT_MODEL = 'gemini-2.5-flash-lite';

/** USD per 1M tokens (image tokens bill as input). Used by the eval script only. Verify at ai.google.dev/pricing. */
export const PRICES_USD_PER_M: Record<string, { input: number; output: number }> = {
  'gemini-2.5-flash-lite': { input: 0.1, output: 0.4 },
  'gemini-3.1-flash-lite': { input: 0.25, output: 1.5 },
};

export const FREE_SCANS_PER_MONTH = 10;
export const MAX_IMAGE_BYTES = 1_500_000; // same cap as the Storage bucket
export const GEMINI_TIMEOUT_MS = 30_000;
/** Scan quota resets on the 1st in Maldives time, not UTC. */
export const TIMEZONE = 'Indian/Maldives';

/** Default category slugs (migration 001). The scanner may only suggest one of these. */
export const CATEGORY_SLUGS = [
  'food-groceries', 'transport', 'bills', 'rent', 'health',
  'education', 'shopping', 'family-support', 'giving', 'other',
] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];
