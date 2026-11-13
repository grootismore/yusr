import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { barPercent } from '@/features/trends/trend';
import { money } from '@/lib/money';
import { radius, space, useColors } from '@/theme/tokens';
import { Text } from './Text';

const HEIGHT = 120;

/**
 * Spending (solid) and income (outlined) for a run of months. Each column is a button that selects the month.
 * Colour is never the only cue: the legend names both, every column has a spoken label with the amounts,
 * and the selected month is underlined and bold. Time runs left to right in English and right to left in Dhivehi.
 */
export function TrendChart({ months, spend, income, selected, onSelect }: { months: string[]; spend: number[]; income: number[]; selected: string; onSelect: (month: string) => void }) {
  const colors = useColors();
  const { t } = useTranslation();
  const names = t('months', { returnObjects: true }) as string[];
  const max = Math.max(1, ...spend, ...income);
  const label = (m: string) => `${names[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
  return (
    <View style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', gap: space.lg, flexWrap: 'wrap' }}>
        {([['trend.spending', colors.accent, 'solid'], ['trend.income', colors.accent, 'outline']] as const).map(([k, c, kind]) => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <View style={{ width: 14, height: 14, borderRadius: 4, borderCurve: 'continuous', backgroundColor: kind === 'solid' ? c : colors.sun, borderWidth: 2, borderColor: c }} />
            <Text variant="small" color={colors.inkMuted}>{t(k)}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-end' }}>
        {months.map((m, i) => {
          const isSel = m === selected;
          return (
            <Pressable
              key={m}
              accessibilityRole="button"
              accessibilityState={{ selected: isSel }}
              accessibilityLabel={`${label(m)}: ${t('trend.spending')} ${money(spend[i])}, ${t('trend.income')} ${money(income[i])}`}
              onPress={() => onSelect(m)}
              style={{ flex: 1, minHeight: 44, alignItems: 'center', gap: space.xs }}
            >
              <View style={{ height: HEIGHT, flexDirection: 'row', alignItems: 'flex-end', gap: 3, width: '100%', justifyContent: 'center' }}>
                <View style={{ width: '40%', maxWidth: 18, height: `${barPercent(spend[i], max)}%`, backgroundColor: colors.accent, borderTopLeftRadius: radius.sm / 2, borderTopRightRadius: radius.sm / 2 }} />
                <View style={{ width: '40%', maxWidth: 18, height: `${barPercent(income[i], max)}%`, borderWidth: income[i] > 0 ? 2 : 0, borderColor: colors.accent, borderBottomWidth: 0, backgroundColor: colors.sun, borderTopLeftRadius: radius.sm / 2, borderTopRightRadius: radius.sm / 2 }} />
              </View>
              <Text latin variant="small" color={isSel ? colors.ink : colors.inkMuted} style={{ fontFamily: isSel ? 'NunitoSans_700Bold' : undefined, textDecorationLine: isSel ? 'underline' : 'none' }}>{`${m.slice(5, 7)}/${m.slice(2, 4)}`}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
