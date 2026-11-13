import { Appearance } from 'react-native';
import { getItem, setItem } from './kv';

export const APPEARANCES = ['system', 'light', 'dark'] as const;
export type AppearanceChoice = (typeof APPEARANCES)[number];
const KEY = 'kharadhu.appearance';

export const isAppearance = (v: unknown): v is AppearanceChoice => (APPEARANCES as readonly unknown[]).includes(v);

/** Make the app follow the choice: "system" follows the phone, otherwise it is forced light or dark. */
export function applyAppearance(choice: AppearanceChoice): void {
  Appearance.setColorScheme(choice === 'system' ? 'unspecified' : choice);
}

export async function loadAppearance(): Promise<AppearanceChoice> {
  const stored = await getItem(KEY);
  return isAppearance(stored) ? stored : 'system';
}

export async function saveAppearance(choice: AppearanceChoice): Promise<void> {
  await setItem(KEY, choice);
  applyAppearance(choice);
}
