// Supabase Edge Function (Deno). Secrets: GEMINI_API_KEY (set with `supabase secrets set`);
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are injected by the platform.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { DEFAULT_MODEL } from './config.ts';
import { callGemini } from './gemini.ts';
import { handleScan } from './handler.ts';

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, apikey, x-client-info',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const url = Deno.env.get('SUPABASE_URL')!;
  const authHeader = request.headers.get('authorization');
  // Acts as the user, so Storage and profile reads are covered by RLS.
  const userDb = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader ?? '' } },
    auth: { persistSession: false },
  });
  // Service role is used for one thing only: reserve_scan / refund_scan.
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const bucket = userDb.storage.from('receipts');

  let body: unknown = null;
  try { body = await request.json(); } catch { /* handler rejects a missing path */ }

  const result = await handleScan({ method: request.method, authHeader, body }, {
    async getUserId(header) {
      const token = header?.replace(/^Bearer\s+/i, '');
      if (!token) return null;
      const { data, error } = await userDb.auth.getUser(token);
      return error ? null : data.user?.id ?? null;
    },
    async reserveScan(userId, month, limit) {
      const { data, error } = await admin.rpc('reserve_scan', { p_user: userId, p_month: month, p_limit: limit });
      if (error) throw error;
      return data as number | null;
    },
    async refundScan(userId, month) {
      await admin.rpc('refund_scan', { p_user: userId, p_month: month });
    },
    async download(path) {
      const { data, error } = await bucket.download(path);
      if (error || !data) return null;
      return { bytes: new Uint8Array(await data.arrayBuffer()), mimeType: data.type || 'image/jpeg' };
    },
    async deleteImage(path) {
      const { error } = await bucket.remove([path]);
      return !error;
    },
    async keepImages(userId) {
      const { data } = await userDb.from('profiles').select('keep_receipt_images').eq('id', userId).maybeSingle();
      return data?.keep_receipt_images === true;
    },
    extract: async (image) =>
      (await callGemini({
        apiKey: Deno.env.get('GEMINI_API_KEY')!,
        model: Deno.env.get('GEMINI_MODEL') ?? DEFAULT_MODEL,
        mimeType: image.mimeType,
        image: image.bytes,
      })).raw,
  });

  return new Response(JSON.stringify(result.json), { status: result.status, headers: { ...cors, 'content-type': 'application/json' } });
});
