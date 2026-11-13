import { useTranslation } from 'react-i18next';
import { money } from '@/lib/money';
import { Text, type AppTextProps } from './Text';

const MARK = '\u0001';

/**
 * A translated sentence with amounts inside it. Amounts (integer laari) are rendered as their own
 * Latin-font, left-to-right runs, so "MVR 1,234.50" is exact inside Dhivehi and English alike.
 * Other placeholders are plain values.
 */
export function Msg({ k, amounts = {}, values = {}, ...rest }: AppTextProps & { k: string; amounts?: Record<string, number>; values?: Record<string, string | number> }) {
  const { t } = useTranslation();
  const raw = t(k, { ...values, ...Object.fromEntries(Object.keys(amounts).map((n) => [n, `${MARK}${n}${MARK}`])) }) as string;
  const parts = raw.split(new RegExp(`${MARK}(\\w+)${MARK}`));
  return (
    <Text {...rest}>
      {parts.map((p, i) =>
        i % 2 === 1 ? <Text key={i} latin variant={rest.variant} color={rest.color} style={{ fontVariant: ['tabular-nums'] }}>{money(amounts[p])}</Text> : p,
      )}
    </Text>
  );
}
