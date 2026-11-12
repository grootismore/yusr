import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

interface Use { screen: string; role: string; order: number }
interface Usage { screens: string[]; app: Record<string, Use[]>; invite: Record<string, Use[]> }

// Runs the real scanner on the real source, so the editor's "where it shows up" cannot silently rot.
describe('wording usage scanner', () => {
  let usage: Usage;
  beforeAll(() => {
    execFileSync(process.execPath, ['--no-warnings', '--experimental-strip-types', 'scripts/copy-usage.ts'], { stdio: 'pipe' });
    usage = JSON.parse(readFileSync('web/copy/usage.json', 'utf8')) as Usage;
  });
  const has = (key: string, screen: string, role?: string) => (usage.app[key] ?? []).some((u) => u.screen === screen && (!role || u.role === role));

  it('places known strings on the right screens with the right kind of text', () => {
    expect(has('giving.title', 'Sadaqat plans', 'Screen title')).toBe(true);
    expect(has('tabs.giving', 'Tab bar', 'Tab label')).toBe(true);
    expect(has('debts.strategies.snowball', 'Debts', 'Choice')).toBe(true); // a template key (strategies.${value})
    expect(has('giving.howItWorks', 'Sadaqat plans', 'Hint')).toBe(true);
    expect(has('onboarding.getStarted', 'Welcome (first launch)')).toBe(true);
    expect(has('consent.accept', 'Updated terms', 'Button')).toBe(true);
    expect(has('settings.withdrawHint', 'Settings')).toBe(true); // inside a template string
    expect(has('monthsShort.m11', 'Shared text')).toBe(true); // a template nested in a template
    expect(usage.invite.invalidTitle[0]).toMatchObject({ screen: 'Invite page: problems', role: 'Title' });
  });

  it('finds almost every string, and lists the screens in a sensible order', () => {
    expect(Object.keys(usage.app).length).toBeGreaterThan(420);
    expect(usage.screens.slice(0, 3)).toEqual(['Welcome (first launch)', 'Sign in and create account', 'Updated terms']);
  });
});
