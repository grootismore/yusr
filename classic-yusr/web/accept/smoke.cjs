/**
 * Browser verification of the trusted-contact accept page against a LOCAL Supabase.
 * Drives web/accept/index.html in Chromium and checks the real function and database: accept,
 * decline, spent / malformed / missing links, Dhivehi RTL, keyboard order, touch targets,
 * offline retry, privacy (only the invite function is contacted, no cookies or storage) and
 * WCAG AA contrast in light and dark.
 *
 * Needs Playwright and the local stack with `supabase functions serve accept-invite --no-verify-jwt`.
 * The function throttles to 20 attempts per hour per address, so clear public.invite_attempts
 * between runs:  psql ... -c "delete from public.invite_attempts"
 *
 *   API_URL=http://127.0.0.1:54321 ANON_KEY=<local anon key> node web/accept/smoke.cjs
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
process.env.PAGE = path.join(os.tmpdir(), 'yusr-accept.html');
process.env.OUT = process.env.OUT || os.tmpdir();
fs.writeFileSync(
  process.env.PAGE,
  fs
    .readFileSync(path.join(__dirname, 'index.html'), 'utf8')
    .replace('__FUNCTION_URL__', `${process.env.API_URL}/functions/v1/accept-invite`)
    .replace('__STRINGS__', () => JSON.stringify(JSON.parse(fs.readFileSync(path.join(__dirname, 'strings.json'), 'utf8')))),
);
const { chromium } = require('playwright');
const crypto = require('node:crypto');
const API = process.env.API_URL, KEY = process.env.ANON_KEY, FILE = process.env.PAGE;
const results = [];
const check = (name, ok, extra = '') => { results.push([ok, name, extra]); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  -> ' + extra : ''}`); };
const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };

async function makeInvite(label) {
  const email = `${label}-${crypto.randomUUID()}@example.test`;
  const su = await j(await fetch(`${API}/auth/v1/signup`, { method: 'POST', headers: { apikey: KEY, 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'correct-horse-9' }) }));
  const token = crypto.randomBytes(32).toString('base64url');
  const row = { id: crypto.randomUUID(), user_id: su.user.id, name: 'Cee', inviter_name: 'Aisha', email: `c-${crypto.randomUUID()}@example.test`,
    invite_token_hash: crypto.createHash('sha256').update(token).digest('hex'), invite_expires_at: new Date(Date.now() + 864e5).toISOString(), consented_at: new Date().toISOString() };
  const ins = await fetch(`${API}/rest/v1/trusted_contacts`, { method: 'POST', headers: { apikey: KEY, authorization: `Bearer ${su.access_token}`, 'content-type': 'application/json', prefer: 'return=minimal' }, body: JSON.stringify(row) });
  if (!ins.ok) throw new Error('insert failed ' + (await ins.text()));
  const status = async () => (await j(await fetch(`${API}/rest/v1/trusted_contacts?id=eq.${row.id}&select=status,invite_token_hash`, { headers: { apikey: KEY, authorization: `Bearer ${su.access_token}` } })))[0];
  return { token, status };
}
const lum = (rgb) => { const [r, g, b] = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const requests = []; const errors = [];
  ctx.on('request', (r) => requests.push(r.url()));
  const open = async (hash) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(String(e))); p.on('console', (m) => m.type() === 'error' && !m.text().startsWith('Failed to load resource') && errors.push(m.text())); await p.goto(`file://${FILE}${hash}`); return p; };

  // 1. accept path
  const inv = await makeInvite('accept');
  let page = await open('#' + inv.token);
  await page.getByRole('heading', { name: 'You have been invited' }).waitFor();
  check('invitation names who invited, from the server', (await page.textContent('#body')).includes('Aisha has invited you'));
  check('says accepting gives no access', (await page.textContent('#body')).includes('does not give you access'));
  check('contact still "invited" in the database before they answer', (await inv.status()).status === 'invited');
  await page.screenshot({ path: process.env.OUT + '/invite-light.png' });
  await page.getByRole('button', { name: 'Accept' }).click();
  await page.getByRole('heading', { name: 'Thank you' }).waitFor();
  const after = await inv.status();
  check('database shows accepted and the token spent', after.status === 'accepted' && after.invite_token_hash === null);
  check('focus moves to the result heading for screen readers', await page.evaluate(() => document.activeElement && document.activeElement.id === 'title'));

  // 2. the same link again
  const again = await open('#' + inv.token);
  await again.getByRole('heading', { name: 'This link is no longer valid' }).waitFor();
  check('a used link is refused', true);

  // 3. decline path
  const inv2 = await makeInvite('decline');
  const p2 = await open('#' + inv2.token);
  await p2.getByRole('button', { name: 'Decline' }).click();
  await p2.getByRole('heading', { name: 'Declined' }).waitFor();
  check('decline revokes in the database', (await inv2.status()).status === 'revoked');

  // 4. missing token and garbage token
  const none = await open('');
  await none.getByRole('heading', { name: 'This link is incomplete' }).waitFor();
  check('a link with no token explains itself', true);
  const junk = await open('#not-a-token');
  await junk.getByRole('heading', { name: 'This link is no longer valid' }).waitFor();
  check('a malformed token is treated as invalid', true);

  // 5. Dhivehi + RTL, then back
  const inv3 = await makeInvite('dv');
  const p3 = await open('#' + inv3.token);
  await p3.getByRole('heading', { name: 'You have been invited' }).waitFor();
  await p3.getByRole('button', { name: 'ދިވެހި' }).click();
  check('switching to Dhivehi sets right-to-left and lang', await p3.evaluate(() => document.documentElement.dir === 'rtl' && document.documentElement.lang === 'dv'));
  check('the whole card is translated (Thaana present, no English body)', /[ހ-޿]/.test(await p3.textContent('#body')) && !(await p3.textContent('#body')).includes('trusted contact on Yusr'));
  await p3.screenshot({ path: process.env.OUT + '/invite-dv-rtl.png' });
  await p3.getByRole('button', { name: 'English' }).click();
  check('and back to English left-to-right', await p3.evaluate(() => document.documentElement.dir === 'ltr'));

  // 6. keyboard order and visible focus
  const kb = await open('#' + (await makeInvite('kb')).token);
  await kb.getByRole('heading', { name: 'You have been invited' }).waitFor();
  const order = [];
  for (let i = 0; i < 3; i++) { await kb.keyboard.press('Tab'); order.push(await kb.evaluate(() => document.activeElement.id)); }
  check('Tab order is language, accept, decline', JSON.stringify(order) === JSON.stringify(['lang', 'accept', 'decline']), order.join(' > '));
  check('focused control has a visible outline', await kb.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2; }));
  check('touch targets are at least 44px', await kb.evaluate(() => ['lang', 'accept', 'decline'].every((id) => { const r = document.getElementById(id).getBoundingClientRect(); return r.height >= 44 && r.width >= 44; })));

  // 7. network failure and retry
  const off = await makeInvite('offline');
  const p7 = await ctx.newPage();
  await p7.goto(`file://${FILE}#${off.token}`); await p7.getByRole('heading', { name: 'You have been invited' }).waitFor();
  await ctx.setOffline(true);
  await p7.getByRole('button', { name: 'Accept' }).click();
  await p7.getByRole('heading', { name: 'Something went wrong' }).waitFor();
  check('offline: friendly error with a retry button', await p7.getByRole('button', { name: 'Try again' }).isVisible());
  await ctx.setOffline(false);
  await p7.getByRole('button', { name: 'Try again' }).click();
  await p7.getByRole('heading', { name: 'You have been invited' }).waitFor();
  check('retry recovers', (await off.status()).status === 'invited');

  // 8. privacy: nothing but the function is contacted; no storage; no cookies
  const foreign = requests.filter((u) => !u.startsWith('file://') && !u.startsWith(API + '/functions/v1/accept-invite'));
  check('the page contacts only the invite function', foreign.length === 0, foreign.join(', '));
  check('no cookies are set', (await ctx.cookies()).length === 0);
  check('no local/session storage is used', await page.evaluate(() => localStorage.length === 0 && sessionStorage.length === 0));
  check('the token travels in the request body, never the URL', requests.every((u) => !u.includes(inv.token)));
  check('no uncaught exceptions or console errors (expected 4xx responses excluded)', errors.length === 0, errors.join(' | '));

  // 9. contrast (WCAG AA 4.5:1 for text) in light and dark, from the page's own colours
  for (const scheme of ['light', 'dark']) {
    const c = await browser.newContext({ colorScheme: scheme, viewport: { width: 390, height: 844 } });
    const p = await c.newPage(); await p.goto(`file://${FILE}#${inv.token}`);
    await p.waitForLoadState();
    const v = await p.evaluate(() => { const s = getComputedStyle(document.documentElement); const g = (n) => s.getPropertyValue(n).trim(); return { surface: g('--surface'), text: g('--text'), muted: g('--muted'), tint: g('--tint'), onTint: g('--on-tint'), danger: g('--danger'), bg: g('--bg') }; });
    const pairs = [['text on surface', v.text, v.surface], ['muted on surface', v.muted, v.surface], ['button text on tint', v.onTint, v.tint], ['link/outline button text on surface', v.tint, v.surface], ['error text on surface', v.danger, v.surface], ['brand on page', v.text, v.bg]];
    for (const [name, fg, bg] of pairs) { const r = ratio(hex(fg), hex(bg)); check(`${scheme}: ${name} contrast ${r.toFixed(2)}:1`, r >= 4.5); }
    await c.close();
  }
  const dark = await browser.newContext({ colorScheme: 'dark', viewport: { width: 390, height: 844 } });
  const dp = await dark.newPage(); await dp.goto(`file://${FILE}#${(await makeInvite('shot')).token}`); await dp.getByRole('heading', { name: 'You have been invited' }).waitFor();
  await dp.screenshot({ path: process.env.OUT + '/invite-dark.png' });

  await browser.close();
  const failed = results.filter((r) => !r[0]);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error('SCRIPT ERROR', e); process.exit(2); });
