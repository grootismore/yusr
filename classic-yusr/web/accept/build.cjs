/**
 * Builds the deployable accept page into web/accept/dist:
 *   FUNCTION_URL=https://<ref>.supabase.co/functions/v1/accept-invite node web/accept/build.cjs
 * Fills in the function URL and writes a strict Content-Security-Policy (Netlify `_headers`) that
 * allows only the page's own inline script and style (by hash) and connections to that one host.
 * The invite token is in the URL fragment, so the page also sends no referrer and cannot be framed.
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const functionUrl = process.env.FUNCTION_URL;
if (!functionUrl || !/^https:\/\//.test(functionUrl)) throw new Error('Set FUNCTION_URL to the https URL of the accept-invite function');

// The page's wording is inlined as JSON. `<` is escaped so a string can never close the script tag.
const strings = JSON.stringify(JSON.parse(fs.readFileSync(path.join(__dirname, 'strings.json'), 'utf8'))).replaceAll('<', '\\u003c');
const html = fs
  .readFileSync(path.join(__dirname, 'index.html'), 'utf8')
  .replaceAll('__FUNCTION_URL__', functionUrl)
  .replace('__STRINGS__', () => strings);
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
  `connect-src ${new URL(functionUrl).origin}`,
  "img-src data:", // the logo and favicon are inline
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

const dist = path.join(__dirname, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist);
fs.writeFileSync(path.join(dist, 'index.html'), html);
fs.writeFileSync(
  path.join(dist, '_headers'),
  `/*\n  Content-Security-Policy: ${csp}\n  Referrer-Policy: no-referrer\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Cache-Control: no-store\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n`,
);
console.log(`built ${dist}\n${csp}`);
