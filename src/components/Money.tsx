import { money } from '@/lib/money';
import { Text, type AppTextProps } from './Text';

/** "MVR 1,234.50" as one left-to-right run, so it never reorders inside Thaana text. */
export function Money({ laari, currency = 'MVR', prefix = '', style, ...rest }: AppTextProps & { laari: number; currency?: string; prefix?: string }) {
  return <Text {...rest} latin style={[{ fontVariant: ['tabular-nums'], writingDirection: 'ltr' }, style]}>{prefix}{money(laari, currency)}</Text>;
}
