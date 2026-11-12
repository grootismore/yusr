import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SymbolView, type SFSymbol } from 'expo-symbols';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * Apple's SF Symbols on iOS (they match the system font's weight and scale, per the HIG), with the
 * Ionicons glyph as the fallback on Android. Call sites keep using the Ionicons name.
 */
export const SF_SYMBOLS: Partial<Record<IconName, SFSymbol>> = {
  add: 'plus',
  checkmark: 'checkmark',
  'checkmark-circle': 'checkmark.circle.fill',
  'ellipse-outline': 'circle',
  'chevron-back': 'chevron.left',
  'chevron-forward': 'chevron.right',
  'swap-horizontal-outline': 'arrow.left.arrow.right',
  'heart-outline': 'heart',
  'calendar-outline': 'calendar',
  'time-outline': 'clock',
  'people-outline': 'person.2',
  'receipt-outline': 'doc.text',
  'wallet-outline': 'creditcard',
};

export function AppIcon({ name, size, color, accessible }: { name: IconName; size: number; color: string; accessible?: boolean }) {
  const fallback = <Ionicons accessible={accessible} name={name} size={size} color={color} />;
  const sf = SF_SYMBOLS[name];
  if (!sf) return fallback;
  return <SymbolView name={sf} size={size} tintColor={color} fallback={fallback} accessible={accessible} />;
}
