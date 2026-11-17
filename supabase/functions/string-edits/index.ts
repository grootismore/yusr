// Supabase Edge Function (Deno). Secret: STRINGS_EDITOR_KEY (set with `supabase secrets set`).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleEdits } from './handler.ts';

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type, x-editor-key',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  let body: unknown = null;
  if (request.method === 'POST') { try { body = await request.json(); } catch { /* handler rejects it */ } }
  try {
    const r = await handleEdits({ method: request.method, key: request.headers.get('x-editor-key'), body }, {
      editorKey: Deno.env.get('STRINGS_EDITOR_KEY'),
      async list() {
        const { data, error } = await admin.from('string_edits').select('key, lang, value');
        if (error) throw error;
        return data;
      },
      async save(e) {
        const { error } = await admin.from('string_edits').upsert({ ...e, updated_at: new Date().toISOString() });
        if (error) throw error;
      },
      async remove(key, lang) {
        const { error } = await admin.from('string_edits').delete().eq('key', key).eq('lang', lang);
        if (error) throw error;
      },
    });
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { ...cors, 'content-type': 'application/json' } });
  } catch (e) {
    console.error('string-edits', e);
    return new Response(JSON.stringify({ error: 'server' }), { status: 500, headers: { ...cors, 'content-type': 'application/json' } });
  }
});
