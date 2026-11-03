/**
 * Builds the single public site (yusrmv.netlify.app) into web/site/dist:
 *   /            the legal pages (Terms, Privacy, Cookies, Refunds, Delete account)
 *   /invite/     the trusted-contact accept page (invite links are https://<site>/invite/#<token>)
 *   /editor/     the wording editor (internal tool, passcode, not indexed)
 *
 *   BUSINESS_NAME="…" ADDRESS="…" CONTACT_EMAIL="…" UPDATED=2026-11-03 [REVIEWED=yes] \
 *   INVITE_FUNCTION_URL=https://<ref>.supabase.co/functions/v1/accept-invite \
 *   COPY_FUNCTION_URL=https://<ref>.supabase.co/functions/v1/copy-editor node web/site/build.cjs
 *
 * It runs the three existing builds (which keep their own checks) and joins their output. Each page
 * keeps its own strict Content-Security-Policy: the accept page and the editor need their hashed
 * script and function address, the legal pages need neither, so the header rules are written per
 * path and never overlap (two matching CSP headers would both apply).
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = __dirname;
const legal = path.join(root, '..', 'legal');
const accept = path.join(root, '..', 'accept');
const copy = path.join(root, '..', 'copy');
const dist = path.join(root, 'dist');

for (const name of ['INVITE_FUNCTION_URL', 'COPY_FUNCTION_URL']) if (!process.env[name]) throw new Error(`Set ${name}`);
const build = (dir, functionUrl) =>
  execFileSync(process.execPath, [path.join(dir, 'build.cjs')], { stdio: 'inherit', env: { ...process.env, ...(functionUrl ? { FUNCTION_URL: functionUrl } : {}) } });
build(legal);
build(accept, process.env.INVITE_FUNCTION_URL);
// The editor's "Add missing strings" button loads the app's current strings from starter.json.
execFileSync(process.execPath, ['--no-warnings', '--experimental-strip-types', 'scripts/copy-sync.ts', 'starter'], { stdio: 'inherit', cwd: path.join(root, '..', '..') });
build(copy, process.env.COPY_FUNCTION_URL);

fs.rmSync(dist, { recursive: true, force: true });
fs.cpSync(path.join(legal, 'dist'), dist, { recursive: true });
fs.rmSync(path.join(dist, '_headers'));
fs.mkdirSync(path.join(dist, 'invite'));
fs.copyFileSync(path.join(accept, 'dist', 'index.html'), path.join(dist, 'invite', 'index.html'));
fs.cpSync(path.join(copy, 'dist'), path.join(dist, 'editor'), { recursive: true });
fs.rmSync(path.join(dist, 'editor', '_headers'));

/** The header lines of a one-rule _headers file. */
const headerLines = (file) => fs.readFileSync(file, 'utf8').split('\n').slice(1).filter((line) => line.trim() !== '');
const legalHeaders = headerLines(path.join(legal, 'dist', '_headers'));
const inviteHeaders = headerLines(path.join(accept, 'dist', '_headers'));
const editorHeaders = [...headerLines(path.join(copy, 'dist', '_headers')), '  X-Robots-Tag: noindex'];

const legalPaths = ['/', '/index.html', '/style.css'];
for (const entry of fs.readdirSync(dist, { withFileTypes: true })) {
  if (entry.isDirectory() && !['invite', 'editor'].includes(entry.name)) legalPaths.push(`/${entry.name}/*`);
}
const rules = [...legalPaths.map((p) => [p, legalHeaders]), ['/invite/*', inviteHeaders], ['/editor/*', editorHeaders]];
fs.writeFileSync(path.join(dist, '_headers'), rules.map(([p, lines]) => `${p}\n${lines.join('\n')}\n`).join('\n'));
console.log(`built ${dist}: legal pages at /, accept page at /invite/, editor at /editor/`);
