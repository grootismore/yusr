// Edge Function: delete my account (Deno). Uses the platform-injected service role to remove the
// caller's receipt photos and then the auth user, which cascades to all of their rows.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleDelete } from './handler.ts';

const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type, apikey, x-client-info' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const body = await req.json().catch(() => null);
  const result = await handleDelete({ method: req.method, authHeader: req.headers.get('authorization'), body }, {
    async getUserId(header) {
      const token = header?.replace(/^Bearer\s+/i, '');
      if (!token) return null;
      const { data, error } = await admin.auth.getUser(token);
      return error ? null : data.user?.id ?? null;
    },
    async removeFiles(userId) {
      const bucket = admin.storage.from('receipts');
      for (;;) {
        const { data, error } = await bucket.list(userId, { limit: 100 });
        if (error) throw error;
        if (!data?.length) return;
        const { error: rmError } = await bucket.remove(data.map((f) => `${userId}/${f.name}`));
        if (rmError) throw rmError;
      }
    },
    async deleteUser(userId) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
    },
  });
  return new Response(JSON.stringify(result.json), { status: result.status, headers: { ...cors, 'content-type': 'application/json' } });
});
