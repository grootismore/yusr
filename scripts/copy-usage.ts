/**
 * Works out where each piece of wording shows up in the app, for the wording editor's screen view.
 * It reads the app's source (so the answer stays right as the app changes), and writes
 * web/copy/usage.json:
 *
 *   { "screens": ["Welcome", "Home", ...],
 *     "app":    { "<key>": [{ "screen": "Home", "role": "Hint", "order": 120 }, ...] },
 *     "invite": { "<key>": [{ "screen": "Invite page", "role": "Title", "order": 3 }] } }
 *
 * Run:  node --no-warnings --experimental-strip-types scripts/copy-usage.ts
 * A "role" is the kind of text (title, button, hint, row label ...), guessed from the code around
 * each use; "order" is the line, so a screen's texts can be drawn top to bottom. Good enough for a
 * preview, not a guarantee.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';

const flat = (o: Record<string, unknown>, p = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' && v !== null ? flat(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`]));
const keys = flat(JSON.parse(readFileSync('src/lib/i18n/locales/en.json', 'utf8')));
const keySet = new Set(keys);

/** First match wins. [path pattern, screen name]. */
const SCREENS: [RegExp, string][] = [
  [/app\/\(auth\)\/welcome/, 'Welcome (first launch)'],
  [/app\/\(auth\)\/sign-in|features\/account\/ConsentList/, 'Sign in and create account'],
  [/app\/accept-terms/, 'Updated terms'],
  [/app\/\(tabs\)\/_layout/, 'Tab bar'],
  [/app\/\(tabs\)\/\(home\)/, 'Home'],
  [/app\/\(tabs\)\/transactions/, 'Transactions'],
  [/app\/transaction/, 'Add or edit a transaction'],
  [/app\/\(tabs\)\/debts\/debt\b/, 'Debt form'],
  [/app\/\(tabs\)\/debts\/detail/, 'Debt details'],
  [/app\/\(tabs\)\/debts\/receivable/, 'Money owed to you (form)'],
  [/app\/\(tabs\)\/debts/, 'Debts'],
  [/app\/\(tabs\)\/giving\/commitment/, 'Sadaqat plan form'],
  [/app\/\(tabs\)\/giving/, 'Sadaqat plans'],
  [/app\/\(tabs\)\/more\/settings/, 'Settings'],
  [/app\/\(tabs\)\/more\/about/, 'About'],
  [/app\/\(tabs\)\/more\/accounts/, 'Accounts'],
  [/app\/\(tabs\)\/more\/account\b/, 'Account form'],
  [/app\/\(tabs\)\/more\/categories/, 'Categories'],
  [/app\/\(tabs\)\/more\/category\b/, 'Category form'],
  [/app\/\(tabs\)\/more\/recurring-item/, 'Bill or income form'],
  [/app\/\(tabs\)\/more\/recurring/, 'Bills and income'],
  [/app\/\(tabs\)\/more\/wasiyyah-note/, 'Wasiyyah note'],
  [/app\/\(tabs\)\/more\/wasiyyah-share/, 'Share the register'],
  [/app\/\(tabs\)\/more\/wasiyyah/, 'Wasiyyah register'],
  [/app\/\(tabs\)\/more\/contact-invite/, 'Invite a trusted contact'],
  [/app\/\(tabs\)\/more\/contacts/, 'Trusted contacts'],
  [/app\/\(tabs\)\/more\/audit-log/, 'Activity log'],
  [/app\/\(tabs\)\/more/, 'More'],
  [/app\/delete-account/, 'Delete account'],
  [/features\/account\/DeletionBanner/, 'Deletion banner'],
  [/lib\/auth\/AppLock/, 'Lock screen'],
  [/lib\/useDiscardGuard/, 'Pop-up: leaving a changed form'],
  [/lib\/confirm/, 'Pop-ups'],
  [/components\/RestartGate/, 'Restart screen'],
  [/features\/reminders/, 'Reminder notifications'],
  [/features\/wasiyyah/, 'Shared register text'],
];
const screenOf = (file: string): string => SCREENS.find(([re]) => re.test(file))?.[1] ?? 'Shared text';

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === 'locales' || name === '__tests__' ? [] : walk(p);
    return /\.(tsx?|ts)$/.test(name) && !/\.test\./.test(name) ? [p] : [];
  });

interface Use { screen: string; role: string; order: number }
const app: Record<string, Use[]> = {};
const add = (key: string, use: Use) => {
  const list = (app[key] ??= []);
  if (!list.some((u) => u.screen === use.screen && u.role === use.role)) list.push(use);
};

function roleOf(file: string, before: string, key: string): string {
  const head = before.replace(/\bt\(\s*$/, '').replace(/\s+$/, '');
  const attr = /(\w+)\s*=\s*\{?\s*$/.exec(head)?.[1] ?? /(\w+)\s*:\s*$/.exec(head)?.[1] ?? '';
  const tags = [...before.matchAll(/<([A-Z][\w.]*)/g)];
  const tag = tags.length ? tags[tags.length - 1][1] : '';
  if (/\.errors\.|(Invalid|Required|Taken|Short|Failed)$/.test(key) || tag === 'ErrorText') return 'Error message';
  if (attr.startsWith('accessibility')) return 'Spoken label (VoiceOver)';
  if (/_layout/.test(file) && /\/\(tabs\)\/_layout/.test(file)) return 'Tab label';
  if (/confirmAction|Alert\.alert/.test(before.slice(-260))) return attr === 'title' ? 'Pop-up title' : attr === 'message' ? 'Pop-up text' : 'Pop-up button';
  if (attr === 'titleKey' || (attr === 'title' && /Stack\.Screen|options=\{\{/.test(before.slice(-200)))) return 'Screen title';
  if (attr === 'title') return tag === 'Button' ? 'Button' : tag === 'EmptyState' ? 'Empty-state title' : tag === 'Group' ? 'Section heading' : 'Title';
  if (attr === 'label') {
    if (tag === 'Row') return 'Row label';
    if (tag === 'Field') return 'Field label';
    if (tag === 'HeaderTextButton') return 'Header button';
    if (tag === 'HeaderIconButton') return 'Icon button';
    if (/options=|Chips|Segmented|label:/.test(before.slice(-200))) return 'Choice';
    return 'Label';
  }
  if (attr === 'value' && tag === 'Row') return 'Row value';
  if (attr === 'body') return 'Empty-state text';
  if (attr === 'actionLabel') return 'Empty-state button';
  if (attr === 'footer') return 'Footnote';
  if (attr === 'placeholder') return 'Placeholder';
  if (attr === 'confirmLabel' || attr === 'cancelLabel') return 'Pop-up button';
  if (tag === 'Text' || tag === 'Text>') {
    const size = [...before.matchAll(/fontSize:\s*(\d+)/g)].pop()?.[1];
    if (size) return Number(size) >= 20 ? 'Heading' : Number(size) <= 15 ? 'Hint' : 'Text';
  }
  return 'Text';
}

for (const file of [...walk('app'), ...walk('src')]) {
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n');
  const layout = /_layout\.tsx$/.test(file);
  const literal = /(['"])((?:(?!\1)[^\\\n]|\\.)*)\1/g; // quoted strings, even inside a template
  const templates = /(`)((?:[^`\\]|\\.)*)`/g;
  // Both passes: every string literal, and every t(`...`) call (a template nested inside another template
  // is not seen by the first pass).
  const calls = [...text.matchAll(/\bt\(\s*`([^`]*)`/g)].map((m) => Object.assign([m[0], '`', m[1]] as unknown as RegExpMatchArray, { index: (m.index ?? 0) + m[0].indexOf('`') }));
  for (const m of [...text.matchAll(literal), ...text.matchAll(templates), ...calls]) {
    const q = m[1];
    let found: string[] = [];
    if (q === '`' && m[2].includes('${')) {
      const prefix = m[2].slice(0, m[2].indexOf('${'));
      const suffix = m[2].slice(m[2].lastIndexOf('}') + 1);
      if (prefix.includes('.') && prefix.length >= 3) found = keys.filter((k) => k.startsWith(prefix) && k.endsWith(suffix) && k.length > prefix.length);
    } else if (keySet.has(m[2])) found = [m[2]];
    if (found.length === 0) continue;
    const idx = m.index ?? 0;
    const before = text.slice(Math.max(0, idx - 240), idx);
    const line = text.slice(0, idx).split('\n').length;
    // A layout names the screen it titles: <Stack.Screen name="accounts" ...> belongs to the Accounts screen.
    let screen = screenOf(file);
    if (layout && !/\(tabs\)\/_layout/.test(file)) {
      const name = [...text.slice(Math.max(0, idx - 400), idx).matchAll(/name="([^"]+)"/g)].pop()?.[1];
      screen = name && name !== 'index' ? screenOf(`${dirname(file)}/${name}.tsx`) : screenOf(`${dirname(file)}/index.tsx`);
    }
    for (const key of found) {
      let role = roleOf(file, before, key);
      if (role === 'Text' && /(Hint|Note|guidance|assumptions|else|Explain)$/.test(key)) role = 'Hint'; // helper text under a control
      add(key, { screen, role, order: line });
    }
  }
  void lines; void basename;
}

// The invite page: one page with several states, in the order they are written.
const invite: Record<string, Use[]> = {};
const strings = (JSON.parse(readFileSync('web/accept/strings.json', 'utf8')) as { en: Record<string, unknown> }).en;
Object.keys(strings).forEach((key, i) => {
  const role = /Title$/.test(key) ? 'Title' : /^(accept|decline)$/.test(key) ? 'Button' : key === 'loading' ? 'Status' : 'Text';
  const screen = /^(accept|decline|accepted|declined|declinedTitle)/.test(key)
    ? 'Invite page: answering'
    : /^(invalid|missing|limit|error)/.test(key) ? 'Invite page: problems' : 'Invite page: the invitation';
  invite[key] = [{ screen, role, order: i }];
});

const ORDER = ['Welcome (first launch)', 'Sign in and create account', 'Updated terms', 'Restart screen', 'Lock screen', 'Home', 'Transactions', 'Add or edit a transaction', 'Debts', 'Debt form', 'Debt details', 'Money owed to you (form)', 'Sadaqat plans', 'Sadaqat plan form', 'More', 'Settings', 'About', 'Accounts', 'Account form', 'Categories', 'Category form', 'Bills and income', 'Bill or income form', 'Wasiyyah register', 'Wasiyyah note', 'Trusted contacts', 'Invite a trusted contact', 'Share the register', 'Activity log', 'Delete account', 'Tab bar', 'Deletion banner', 'Reminder notifications', 'Shared register text', 'Pop-up: leaving a changed form', 'Shared text'];
const used = new Set([...Object.values(app), ...Object.values(invite)].flat().map((u) => u.screen));
const screens = [...ORDER.filter((s) => used.has(s)), ...[...used].filter((s) => !ORDER.includes(s)).sort()];

writeFileSync('web/copy/usage.json', JSON.stringify({ screens, app, invite }));
const unused = keys.filter((k) => !app[k]);
console.log(`Wrote web/copy/usage.json: ${Object.keys(app).length} of ${keys.length} app strings placed on ${screens.length} screens${unused.length ? `; not found in the code: ${unused.length}` : ''}.`);
