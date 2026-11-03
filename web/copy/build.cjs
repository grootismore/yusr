/**
 * Builds the wording editor site into web/copy/dist:
 *   FUNCTION_URL=https://<ref>.supabase.co/functions/v1/copy-editor node web/copy/build.cjs
 * Fills in the function URL, copies the Dhivehi font, and writes a strict Content-Security-Policy
 * (Netlify `_headers`): only the page's own script and style (by hash), the font file, inline
 * images, and connections to that one function host (and its own starter.json).
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const functionUrl = process.env.FUNCTION_URL;
if (!functionUrl || !/^(https:\/\/|http:\/\/127\.0\.0\.1)/.test(functionUrl)) throw new Error('Set FUNCTION_URL to the https URL of the copy-editor function (http://127.0.0.1 is allowed for local testing)');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8').replaceAll('__FUNCTION_URL__', functionUrl);
const inline = (tag) => (new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(html) ?? [])[1];
const hash = (text) => `'sha256-${crypto.createHash('sha256').update(text).digest('base64')}'`;
const script = inline('script');
const style = inline('style');
if (!script || !style) throw new Error('expected one inline <script> and one inline <style>');
if ((html.match(/<script/g) ?? []).length !== 1 || /<script[^>]*\ssrc=/.test(html)) throw new Error('the page must have exactly one inline script and no external scripts');

const csp = [
  "default-src 'none'",
  `script-src ${hash(script)}`,
  `style-src ${hash(style)}`,
  "font-src 'self'",
  `connect-src 'self' ${new URL(functionUrl).origin}`,
  'img-src data:',
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

const dist = path.join(__dirname, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist);
fs.writeFileSync(path.join(dist, 'index.html'), html);
// MV Faseyha (free for personal and commercial use) so Dhivehi previews look like the app.
fs.copyFileSync(path.join(__dirname, '../../assets/fonts/MV_Faseyha_Regular.ttf'), path.join(dist, 'MV_Faseyha_Regular.ttf'));
// The strings the "Add missing strings" button loads (made by `npm run copy:starter`).
const starter = path.join(__dirname, 'starter.json');
if (!fs.existsSync(starter)) throw new Error('Run `npm run copy:starter` first: web/copy/starter.json is missing');
fs.copyFileSync(starter, path.join(dist, 'starter.json'));
// Where each string shows up in the app (made by `npm run copy:usage`); the editor works without it but is less helpful.
const usage = path.join(__dirname, 'usage.json');
if (!fs.existsSync(usage)) throw new Error('Run `npm run copy:usage` first: web/copy/usage.json is missing');
fs.copyFileSync(usage, path.join(dist, 'usage.json'));
for (const name of ['NunitoSans_400Regular', 'NunitoSans_700Bold']) {
  fs.copyFileSync(path.join(__dirname, `../../assets/fonts/${name}.ttf`), path.join(dist, `${name}.ttf`));
}
fs.writeFileSync(
  path.join(dist, '_headers'),
  `/*\n  Content-Security-Policy: ${csp}\n  Referrer-Policy: no-referrer\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Cache-Control: no-store\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n`,
);
console.log(`built ${dist}\n${csp}`);
