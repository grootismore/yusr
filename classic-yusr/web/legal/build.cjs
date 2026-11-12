/**
 * Builds the public legal site into web/legal/dist from web/legal/pages/*.html.
 *   BUSINESS_NAME="…" ADDRESS="…" CONTACT_EMAIL="…" UPDATED=2026-11-01 node web/legal/build.cjs
 * Refuses to build unless the business details are real (launch checklist 16), so a draft with
 * placeholders can never be published by accident. The site has no scripts, cookies or storage.
 */
const fs = require('node:fs');
const path = require('node:path');

const values = {
  BUSINESS_NAME: process.env.BUSINESS_NAME,
  ADDRESS: process.env.ADDRESS,
  CONTACT_EMAIL: process.env.CONTACT_EMAIL,
  UPDATED: process.env.UPDATED,
};
for (const [key, value] of Object.entries(values)) {
  if (!value || /^(todo|tbd|xxx)/i.test(value)) throw new Error(`Set ${key} to a real value before building`);
}
if (!/^[^@\s<>"]+@[^@\s<>"]+\.[^@\s<>"]+$/.test(values.CONTACT_EMAIL)) throw new Error('CONTACT_EMAIL is not an email address');
const escape = (text) => text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const template = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
const dist = path.join(__dirname, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist);
fs.copyFileSync(path.join(__dirname, 'style.css'), path.join(dist, 'style.css'));

for (const file of fs.readdirSync(path.join(__dirname, 'pages'))) {
  const slug = path.basename(file, '.html');
  const source = fs.readFileSync(path.join(__dirname, 'pages', file), 'utf8');
  // Drafts carry a DRAFT-REVIEW comment until a lawyer and a native Dhivehi reader have signed off.
  if (source.includes('DRAFT-REVIEW') && process.env.REVIEWED !== 'yes') throw new Error(`${file} is still a draft: remove its DRAFT-REVIEW marker after review, or build with REVIEWED=yes`);
  const title = /<!--\s*title:\s*(.*?)\s*-->/.exec(source)?.[1];
  if (!title) throw new Error(`${file} needs a <!-- title: … --> line`);
  let page = template.replaceAll('{{TITLE}}', escape(title)).replace('{{BODY}}', source.replace(/<!--\s*title:.*?-->\s*/, ''));
  for (const [key, value] of Object.entries(values)) page = page.replaceAll(`{{${key}}}`, escape(value));
  if (/\{\{[A-Z_]+\}\}/.test(page)) throw new Error(`${file} still has an unfilled placeholder`);
  const out = slug === 'index' ? dist : path.join(dist, slug);
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'index.html'), page);
}

fs.writeFileSync(
  path.join(dist, '_headers'),
  `/*\n  Content-Security-Policy: default-src 'none'; style-src 'self'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'\n  Referrer-Policy: no-referrer\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n`,
);
console.log(`built ${dist}: ${fs.readdirSync(path.join(__dirname, 'pages')).length} pages`);
