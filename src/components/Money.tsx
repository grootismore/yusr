import { money } from '@/lib/money';
import { Text, type AppTextProps } from './Text';

/** "MVR 1,234.50" as one left-to-right run, so it never reorders inside Thaana text. */
export function Money({ laari, currency = 'MVR', style, ...rest }: AppTextProps & { laari: number; currency?: string }) {
  return <Text {...rest} latin style={[{ fontVariant: ['tabular-nums'], writingDirection: 'ltr' }, style]}>{money(laari, currency)}</Text>;
}
