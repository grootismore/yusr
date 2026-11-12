import { GEMINI_TIMEOUT_MS } from './config.ts';
import { PROMPT } from './prompt.ts';
import { RESPONSE_SCHEMA } from './schema.ts';

export interface GeminiResult { raw: unknown; inputTokens: number; outputTokens: number }

export class GeminiError extends Error {}

/** Runs in Deno and node. Chunked so large images do not overflow the call stack. */
export function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** One model call per scan. Fixed JSON schema, temperature 0. */
export async function callGemini(
  args: { apiKey: string; model: string; mimeType: string; image: Uint8Array },
  fetchFn: typeof fetch = fetch,
): Promise<GeminiResult> {
  const res = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${args.model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': args.apiKey },
    signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ inline_data: { mime_type: args.mimeType, data: toBase64(args.image) } }, { text: PROMPT }] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA },
    }),
  });
  if (!res.ok) throw new GeminiError(`gemini ${res.status}`);
  const body = await res.json();
  const textOut = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof textOut !== 'string') throw new GeminiError('empty response');
  let raw: unknown;
  try { raw = JSON.parse(textOut); } catch { throw new GeminiError('invalid json'); }
  return {
    raw,
    inputTokens: body?.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: (body?.usageMetadata?.candidatesTokenCount ?? 0) + (body?.usageMetadata?.thoughtsTokenCount ?? 0),
  };
}
