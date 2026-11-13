import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager, Platform } from 'react-native';
import { getItem, setItem } from '../kv';
import dv from './locales/dv.json';
import en from './locales/en.json';

export const LANGUAGES = ['dv', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'dv';

/** Each language is always shown in its own name and script. */
export const LANGUAGE_NAMES: Record<Language, string> = { dv: 'ދިވެހި', en: 'English' };

const STORAGE_KEY = 'kharadhu.language';
const i18n = createInstance();

export const isRtl = (language: Language): boolean => language === 'dv';
export const isLanguage = (value: unknown): value is Language => (LANGUAGES as readonly unknown[]).includes(value);

/** Dhivehi is the default; only an explicit stored choice changes it (the device language does not). */
export const resolveLanguage = (stored: string | null): Language => (isLanguage(stored) ? stored : DEFAULT_LANGUAGE);

/**
 * The phone's own layout direction is kept left-to-right; the app mirrors itself with a `direction` style on its root view
 * (see app/_layout.tsx). That way switching language never needs a restart. Clears a direction an older version forced.
 */
function applyDirection(): void {
  if (Platform.OS === 'web') return; // web follows the root `dir` instead
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
}

export async function initI18n(): Promise<Language> {
  const language = resolveLanguage(await getItem(STORAGE_KEY));
  await i18n.use(initReactI18next).init({
    resources: { dv: { translation: dv }, en: { translation: en } },
    lng: language,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
  applyDirection();
  return language;
}

/** Switch language and remember it. The layout mirrors immediately. */
export async function setLanguage(language: Language): Promise<void> {
  await i18n.changeLanguage(language);
  await setItem(STORAGE_KEY, language);
}

export { i18n };
