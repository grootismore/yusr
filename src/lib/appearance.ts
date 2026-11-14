import { Appearance } from 'react-native';
import { getItem, setItem } from './kv';

export const APPEARANCES = ['system', 'light', 'dark'] as const;
export type AppearanceChoice = (typeof APPEARANCES)[number];
const KEY = 'kharadhu.appearance';

export const isAppearance = (v: unknown): v is AppearanceChoice => (APPEARANCES as readonly unknown[]).includes(v);

/** Make the app follow the choice: "system" follows the phone, otherwise it is forced light or dark. */
export function applyAppearance(choice: AppearanceChoice): void {
  // The website build has no setColorScheme (Sentry caught this as an error on launch); phones do.
  if (typeof Appearance.setColorScheme === 'function') Appearance.setColorScheme(choice === 'system' ? 'unspecified' : choice);
}

/** At launch: only a stored light or dark choice needs applying. "System" is already what the phone does, and telling the phone again can make it announce a change that redraws the whole app. */
export function applyStoredAppearance(choice: AppearanceChoice): void {
  if (choice !== 'system') applyAppearance(choice);
}

export async function loadAppearance(): Promise<AppearanceChoice> {
  const stored = await getItem(KEY);
  return isAppearance(stored) ? stored : 'system';
}

export async function saveAppearance(choice: AppearanceChoice): Promise<void> {
  await setItem(KEY, choice);
  applyAppearance(choice);
}
