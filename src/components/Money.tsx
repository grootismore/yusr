import { formatCompactMoney, ltr } from '@/lib/money';
import { useHideAmounts, useMoneyText } from '@/lib/privacy';
import { Text, type AppTextProps } from './Text';

/**
 * "MVR 1,234.50" as one left-to-right run, so it never reorders inside Thaana text. `compact` is for small boxes: a million or more
 * is shown short ("MVR 1.23M") and the full amount is kept for screen readers, so a figure is never cut off.
 */
export function Money({ laari, currency = 'MVR', prefix = '', compact = false, style, ...rest }: AppTextProps & { laari: number; currency?: string; prefix?: string; compact?: boolean }) {
  const text = useMoneyText();
  const hidden = useHideAmounts();
  const short = compact && !hidden && Math.abs(laari) >= 100_000_000;
  return (
    <Text {...rest} latin accessibilityLabel={short ? text(laari, currency) : rest.accessibilityLabel} style={[{ fontVariant: ['tabular-nums'], writingDirection: 'ltr' }, style]}>
      {prefix}{short ? ltr(formatCompactMoney(laari, currency)) : text(laari, currency)}
    </Text>
  );
}
