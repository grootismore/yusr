jest.mock('@/lib/kv', () => {
  const store = new Map<string, string>();
  return { getItem: async (k: string) => store.get(k) ?? null, setItem: async (k: string, v: string) => void store.set(k, v), removeItem: async (k: string) => void store.delete(k) };
});

async function load(stored?: string) {
  jest.resetModules();
  const kv = require('@/lib/kv');
  if (stored) await kv.setItem('kharadhu.language', stored);
  const rn = require('react-native');
  const force = jest.spyOn(rn.I18nManager, 'forceRTL').mockImplementation(() => {});
  const allow = jest.spyOn(rn.I18nManager, 'allowRTL').mockImplementation(() => {});
  return { force, allow, i18nMod: require('@/lib/i18n') };
}

it('first launch defaults to Dhivehi', async () => {
  const { i18nMod } = await load();
  expect(await i18nMod.initI18n()).toBe('dv');
  expect(i18nMod.i18n.t('tabs.home')).toBe('ހޯމް');
});

it('the phone layout stays left-to-right; the app mirrors itself, so no restart is ever needed', async () => {
  const { force, allow, i18nMod } = await load('dv');
  await i18nMod.initI18n();
  expect(allow).toHaveBeenCalledWith(false);
  expect(force).toHaveBeenCalledWith(false);
});

it('switching language at runtime changes the text and remembers the choice', async () => {
  const { i18nMod } = await load('dv');
  await i18nMod.initI18n();
  await i18nMod.setLanguage('en');
  expect(i18nMod.i18n.t('tabs.home')).toBe('Home');
  expect(await require('@/lib/kv').getItem('kharadhu.language')).toBe('en');
});

it('English stored: starts in English', async () => {
  const { i18nMod } = await load('en');
  expect(await i18nMod.initI18n()).toBe('en');
});
