import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { monthGrid, shiftMonth } from '@/lib/calendar';
import { formatDate, parseDate, today } from '@/lib/dates';
import { radius, space, TOUCH, useColors } from '@/theme/tokens';
import { Text } from './Text';
import { Icon, Row } from './ui';

type Mode = 'days' | 'months' | 'years';
const YEARS = 12;

/**
 * A date you pick from a calendar: tap the field, tap a day. Tap the month to jump to another month or year.
 * `value` and `onChangeText` use the same DD/MM/YYYY text the screens already read with parseDate.
 */
export function DateField({ label, hint, value, onChangeText, error, flag, min, max }: { label: string; hint?: string; value: string; onChangeText: (v: string) => void; error?: string | null; flag?: boolean; min?: string; max?: string }) {
  const colors = useColors();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('days');
  const selected = parseDate(value);
  const start = selected ?? today();
  const [view, setView] = useState({ year: +start.slice(0, 4), month: +start.slice(5, 7) });
  const [yearFrom, setYearFrom] = useState(view.year - 5);
  const months = t('months', { returnObjects: true }) as string[];
  const weekdays = t('calendar.weekdays', { returnObjects: true }) as string[];
  const now = today();

  function show() {
    const s = parseDate(value) ?? now;
    setView({ year: +s.slice(0, 4), month: +s.slice(5, 7) });
    setMode('days');
    setOpen(true);
  }
  const pick = (iso: string) => { onChangeText(formatDate(iso)); setOpen(false); };
  const blocked = (iso: string) => (!!min && iso < min) || (!!max && iso > max);
  const nav = (icon: string, labelKey: string, onPress: () => void) => (
    <Pressable accessibilityRole="button" accessibilityLabel={t(labelKey)} onPress={onPress} hitSlop={8} style={{ width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={22} color={colors.ink} />
    </Pressable>
  );
  const cell = (key: string, text: string, on: boolean, onPress: () => void, wide?: boolean) => (
    <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress}
      style={{ width: wide ? '33.33%' : '25%', height: 48, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ minWidth: 64, paddingVertical: space.sm, paddingHorizontal: space.md, borderRadius: radius.md, backgroundColor: on ? colors.accent : 'transparent', alignItems: 'center' }}>
        <Text style={{ color: on ? colors.onAccent : colors.ink }}>{text}</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={{ gap: space.xs }}>
      <Text variant="label">{label}</Text>
      {hint ? <Text variant="small" color={colors.inkMuted}>{hint}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={show}
        style={{ minHeight: 52, borderRadius: radius.md, borderCurve: 'continuous', borderWidth: flag || error ? 2.5 : 1.5, borderColor: error ? colors.coral : flag ? colors.amberDeep : colors.control, backgroundColor: flag ? colors.amberWash : colors.field, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ writingDirection: 'ltr' }}>{value || t('calendar.pick')}</Text>
        <Icon name="calendar-outline" size={22} color={colors.inkMuted} />
      </Pressable>
      {error ? <Text variant="small" color={colors.coral} accessibilityLiveRegion="polite">{error}</Text> : null}
      <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <Pressable accessibilityLabel={t('common.cancel')} onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <Pressable accessibilityViewIsModal onPress={() => undefined} style={{ backgroundColor: colors.ground, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.lg, paddingBottom: space.xxl, gap: space.sm }}>
            {mode === 'days' ? (
              <>
                <Row style={{ justifyContent: 'space-between' }}>
                  {nav('chevron-back', 'calendar.prevMonth', () => setView((v) => shiftMonth(v.year, v.month, -1)))}
                  <Pressable accessibilityRole="button" accessibilityLabel={t('calendar.chooseMonth')} onPress={() => { setYearFrom(view.year - 5); setMode('months'); }} style={{ minHeight: TOUCH, justifyContent: 'center', paddingHorizontal: space.md }}>
                    <Text variant="title">{months[view.month - 1]} {view.year}</Text>
                  </Pressable>
                  {nav('chevron-forward', 'calendar.nextMonth', () => setView((v) => shiftMonth(v.year, v.month, 1)))}
                </Row>
                <View style={{ flexDirection: 'row' }}>
                  {weekdays.map((w) => <View key={w} style={{ width: '14.285%', alignItems: 'center' }}><Text variant="small" color={colors.inkMuted}>{w}</Text></View>)}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {monthGrid(view.year, view.month).map(({ iso, inMonth }) => {
                    const on = iso === selected;
                    const off = blocked(iso);
                    return (
                      <Pressable key={iso} accessibilityRole="button" accessibilityLabel={formatDate(iso)} accessibilityState={{ selected: on, disabled: off }} disabled={off} onPress={() => pick(iso)}
                        style={{ width: '14.285%', height: 46, alignItems: 'center', justifyContent: 'center' }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.accent : 'transparent', borderWidth: iso === now && !on ? 1.5 : 0, borderColor: colors.accent }}>
                          <Text style={{ writingDirection: 'ltr', color: on ? colors.onAccent : off || !inMonth ? colors.inkMuted : colors.ink, opacity: off ? 0.4 : inMonth ? 1 : 0.55 }}>{+iso.slice(8)}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Pressable accessibilityRole="button" onPress={() => pick(now)} disabled={blocked(now)} style={{ minHeight: TOUCH, justifyContent: 'center' }}><Text color={colors.accent}>{t('common.today')}</Text></Pressable>
                  <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={{ minHeight: TOUCH, justifyContent: 'center' }}><Text color={colors.inkMuted}>{t('common.cancel')}</Text></Pressable>
                </Row>
              </>
            ) : mode === 'months' ? (
              <>
                <Row style={{ justifyContent: 'space-between' }}>
                  {nav('chevron-back', 'calendar.prevYear', () => setView((v) => ({ ...v, year: v.year - 1 })))}
                  <Pressable accessibilityRole="button" accessibilityLabel={t('calendar.chooseYear')} onPress={() => { setYearFrom(view.year - 5); setMode('years'); }} style={{ minHeight: TOUCH, justifyContent: 'center', paddingHorizontal: space.md }}>
                    <Text variant="title">{view.year}</Text>
                  </Pressable>
                  {nav('chevron-forward', 'calendar.nextYear', () => setView((v) => ({ ...v, year: v.year + 1 })))}
                </Row>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {months.map((m, i) => cell(m, m.slice(0, 3), view.month === i + 1, () => { setView((v) => ({ ...v, month: i + 1 })); setMode('days'); }, true))}
                </View>
              </>
            ) : (
              <>
                <Row style={{ justifyContent: 'space-between' }}>
                  {nav('chevron-back', 'calendar.prevYears', () => setYearFrom((y) => y - YEARS))}
                  <Text variant="title" style={{ writingDirection: 'ltr' }}>{yearFrom} – {yearFrom + YEARS - 1}</Text>
                  {nav('chevron-forward', 'calendar.nextYears', () => setYearFrom((y) => y + YEARS))}
                </Row>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {Array.from({ length: YEARS }, (_, i) => yearFrom + i).map((y) => cell(String(y), String(y), view.year === y, () => { setView((v) => ({ ...v, year: y })); setMode('months'); }, true))}
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
