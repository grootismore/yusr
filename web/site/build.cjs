/**
 * Builds the single public site (yusrmv.netlify.app) into web/site/dist:
 *   /            the legal pages (Terms, Privacy, Cookies, Refunds, Delete account)
 *   /invite/     the trusted-contact accept page (invite links are https://<site>/invite/#<token>)
 *
 *   BUSINESS_NAME="…" ADDRESS="…" CONTACT_EMAIL="…" UPDATED=2026-11-03 [REVIEWED=yes] \
 *   FUNCTION_URL=https://<ref>.supabase.co/functions/v1/accept-invite node web/site/build.cjs
 *
 * It runs the two existing builds (which keep their own checks) and joins their output. Each page
 * keeps its own strict Content-Security-Policy: the accept page needs its hashed script and the
 * function address, the legal pages need neither, so the header rules are written per path and
 * never overlap (two matching CSP headers would both apply).
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = __dirname;
const legal = path.join(root, '..', 'legal');
const accept = path.join(root, '..', 'accept');
const dist = path.join(root, 'dist');

for (const dir of [legal, accept]) execFileSync(process.execPath, [path.join(dir, 'build.cjs')], { stdio: 'inherit', env: process.env });

fs.rmSync(dist, { recursive: true, force: true });
fs.cpSync(path.join(legal, 'dist'), dist, { recursive: true });
fs.rmSync(path.join(dist, '_headers'));
fs.mkdirSync(path.join(dist, 'invite'));
fs.copyFileSync(path.join(accept, 'dist', 'index.html'), path.join(dist, 'invite', 'index.html'));

/** The header lines of a one-rule _headers file. */
const headerLines = (file) => fs.readFileSync(file, 'utf8').split('\n').slice(1).filter((line) => line.trim() !== '');
const legalHeaders = headerLines(path.join(legal, 'dist', '_headers'));
const inviteHeaders = headerLines(path.join(accept, 'dist', '_headers'));

const legalPaths = ['/', '/index.html', '/style.css'];
for (const entry of fs.readdirSync(dist, { withFileTypes: true })) {
  if (entry.isDirectory() && entry.name !== 'invite') legalPaths.push(`/${entry.name}/*`);
}
const rules = [...legalPaths.map((p) => [p, legalHeaders]), ['/invite/*', inviteHeaders]];
fs.writeFileSync(path.join(dist, '_headers'), rules.map(([p, lines]) => `${p}\n${lines.join('\n')}\n`).join('\n'));
console.log(`built ${dist}: legal pages at /, accept page at /invite/`);
