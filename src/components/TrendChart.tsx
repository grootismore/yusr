import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { smoothPath } from '@/features/trends/chart';
import { useMoneyText } from '@/lib/privacy';
import { series, space, useColors, useIsDark } from '@/theme/tokens';
import { Text } from './Text';

const HEIGHT = 150, PAD = 14;

/**
 * Spending and income over the last months as two smooth lines over a soft fill. Tap a month to select it.
 * Colour is never the only cue: the legend names both lines, each month is a button with its amounts spoken,
 * and the selected month has a marker and a bold label. Time runs left to right in English and right to left in Dhivehi.
 */
export function TrendChart({ months, spend, income, selected, onSelect }: { months: string[]; spend: number[]; income: number[]; selected: string; onSelect: (month: string) => void }) {
  const colors = useColors();
  const dark = useIsDark();
  const { t, i18n } = useTranslation();
  const money = useMoneyText();
  const [width, setWidth] = useState(0);
  const names = t('months', { returnObjects: true }) as string[];
  const palette = dark ? series.dark : series.light;
  const spendColor = palette[0], incomeColor = palette[1];
  const rtl = i18n.language === 'dv';
  const order = months.map((_, i) => i);
  if (rtl) order.reverse();
  const max = Math.max(1, ...spend, ...income);
  const n = months.length;
  const colW = width / n;
  const x = (slot: number) => colW * slot + colW / 2;
  const y = (v: number) => HEIGHT - PAD - (v / max) * (HEIGHT - PAD * 2);
  const pts = (vals: number[]) => order.map((mi, slot) => ({ x: x(slot), y: y(vals[mi]) }));
  const floor = HEIGHT - PAD;
  const line = (vals: number[]) => smoothPath(pts(vals), floor);
  const spendPts = pts(spend);
  const area = width ? `${line(spend)} L${spendPts[n - 1].x},${HEIGHT} L${spendPts[0].x},${HEIGHT} Z` : '';
  const label = (m: string) => `${names[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
  const selSlot = order.findIndex((mi) => months[mi] === selected);

  return (
    <View style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', gap: space.lg, flexWrap: 'wrap' }}>
        {([['trend.spending', spendColor], ['trend.income', incomeColor]] as const).map(([k, c]) => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <View style={{ width: 18, height: 4, borderRadius: 2, backgroundColor: c }} />
            <Text variant="small" color={colors.inkMuted}>{t(k)}</Text>
          </View>
        ))}
      </View>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: HEIGHT }}>
        {width > 0 ? (
          <Svg width={width} height={HEIGHT} style={{ position: 'absolute' }}>
            <Defs>
              <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={spendColor} stopOpacity={0.28} />
                <Stop offset="1" stopColor={spendColor} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Line x1={0} x2={width} y1={floor} y2={floor} stroke={colors.line} strokeWidth={1} />
            {selSlot >= 0 ? <Line x1={x(selSlot)} x2={x(selSlot)} y1={0} y2={floor} stroke={colors.line} strokeWidth={2} strokeDasharray="3 4" /> : null}
            <Path d={area} fill="url(#fill)" />
            <Path d={line(income)} stroke={incomeColor} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <Path d={line(spend)} stroke={spendColor} strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {selSlot >= 0 ? (
              <>
                <Circle cx={x(selSlot)} cy={y(income[order[selSlot]])} r={5} fill={colors.card} stroke={incomeColor} strokeWidth={3} />
                <Circle cx={x(selSlot)} cy={y(spend[order[selSlot]])} r={6} fill={colors.card} stroke={spendColor} strokeWidth={3.5} />
              </>
            ) : null}
          </Svg>
        ) : null}
        <View style={{ flexDirection: 'row', height: HEIGHT }}>
          {order.map((mi) => (
            <Pressable key={months[mi]} accessibilityRole="button" accessibilityState={{ selected: months[mi] === selected }}
              accessibilityLabel={`${label(months[mi])}: ${t('trend.spending')} ${money(spend[mi])}, ${t('trend.income')} ${money(income[mi])}`}
              onPress={() => onSelect(months[mi])} style={{ flex: 1 }} />
          ))}
        </View>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {order.map((mi) => {
          const isSel = months[mi] === selected;
          return <Text key={months[mi]} latin variant="small" color={isSel ? colors.ink : colors.inkMuted} style={{ flex: 1, textAlign: 'center', fontWeight: isSel ? '700' : undefined }}>{`${months[mi].slice(5, 7)}/${months[mi].slice(2, 4)}`}</Text>;
        })}
      </View>
    </View>
  );
}
