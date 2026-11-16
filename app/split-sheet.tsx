import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { Share, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { DateField } from '@/components/DateField';
import { Text } from '@/components/Text';
import { Button, Field, Icon, Logo, Row, Screen, StackHeader } from '@/components/ui';
import { useSplit } from '@/data/hooks';
import { daySheet, type DaySheet } from '@/features/split/sheet';
import { addDays, formatDate, parseDate, today } from '@/lib/dates';
import { success } from '@/lib/haptics';
import { money } from '@/lib/money';
import { toast } from '@/lib/toast';
import { radius, space } from '@/theme/tokens';

// The picture is the same in light and dark mode and whatever the phone's settings: it is made to be read in a chat.
const PAPER = '#FFFFFF', INK = '#1E2023', MUTED = '#4A4E54', LINE = '#D5DAE0', OWE = '#A52D26', GOOD = '#1F6B4A';

/** A group's sheet for one day: what was spent, who paid, who owes whom. Shared as a picture, so people without the app can read it. */
export default function SplitSheet() {
  const { t, i18n } = useTranslation();
  const { group, date: dateParam } = useLocalSearchParams<{ group: string; date?: string }>();
  const splitQ = useSplit();
  const data = useMemo(() => splitQ.data ?? { groups: [], people: [], expenses: [], shares: [], settlements: [] }, [splitQ.data]);
  const [text, setText] = useState(formatDate(dateParam && parseDate(dateParam) ? dateParam : today()));
  const date = parseDate(text) ?? today();
  // On a picture others will read, "Me" means nothing: let the person put their name on it.
  const meRow = data.people.find((p) => p.group_id === group && p.is_me);
  const [myName, setMyName] = useState<string | null>(null);
  const shown = myName ?? meRow?.name ?? '';
  const sheet = useMemo(() => daySheet(myName === null ? data : { ...data, people: data.people.map((p) => (p.group_id === group && p.is_me ? { ...p, name: myName.trim() || p.name } : p)) }, group, date), [data, group, date, myName]);
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [busy, setBusy] = useState(false);
  const rtl = i18n.language === 'dv';
  if (!sheet) return <Screen><StackHeader title={t('sheet.title')} /></Screen>;
  const fmt = (n: number) => money(n, sheet.currency);

  async function shareImage() {
    setBusy(true);
    try {
      const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
      if (!(await Sharing.isAvailableAsync())) { toast(t('sheet.unavailable'), 'error'); return; }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: t('sheet.sendTitle', { group: sheet!.group }) });
      success();
    } catch { toast(t('sheet.failed'), 'error'); } finally { setBusy(false); }
  }
  async function shareText() { try { await Share.share({ message: sheetText(sheet!, t, fmt) }); } catch { /* the person closed it */ } }

  return (
    <Screen>
      <StackHeader title={t('sheet.title')} />
      <Row style={{ justifyContent: 'space-between' }}>
        <Button kind="ghost" icon={rtl ? 'chevron-forward' : 'chevron-back'} label={t('sheet.prevDay')} onPress={() => setText(formatDate(addDays(date, -1)))} />
        <Button kind="ghost" icon={rtl ? 'chevron-back' : 'chevron-forward'} label={t('sheet.nextDay')} disabled={date >= today()} onPress={() => setText(formatDate(addDays(date, 1)))} />
      </Row>
      <DateField label={t('expense.date')} value={text} onChangeText={setText} max={today()} />
      {meRow && meRow.name === t('split.meDefault') ? <Field label={t('sheet.yourName')} hint={t('sheet.yourNameHint')} value={shown} onChangeText={setMyName} maxLength={40} autoCapitalize="words" /> : null}

      <View ref={ref} collapsable={false} {...{ dir: rtl ? 'rtl' : 'ltr' }} style={{ backgroundColor: PAPER, borderRadius: radius.lg, padding: space.xl, gap: space.lg }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row style={{ gap: space.sm }}><Logo size={24} /><Text variant="label" color={INK}>Kharadhu</Text></Row>
          <Text latin variant="label" color={MUTED}>{formatDate(sheet.date)}</Text>
        </Row>
        <View style={{ gap: 2 }}>
          <Text variant="title" color={INK}>{sheet.group}</Text>
          <Text color={MUTED}>{t('sheet.heading')}</Text>
        </View>

        <View style={{ gap: space.sm }}>
          <Text variant="heading" color={INK}>{t('sheet.costs')}</Text>
          {sheet.lines.length === 0 ? <Text color={MUTED}>{t('sheet.none')}</Text> : sheet.lines.map((l) => (
            <View key={l.id} style={{ gap: 2, paddingBottom: space.sm, borderBottomWidth: 1, borderBottomColor: LINE }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text color={INK} style={{ flex: 1 }}>{l.description}</Text>
                <Text latin color={INK}>{fmt(l.amount)}</Text>
              </Row>
              <Text variant="small" color={MUTED}>{t('split.paidByLine', { name: l.paidBy })} · {t('sheet.among', { names: l.among.join(', ') })}</Text>
            </View>
          ))}
          {sheet.lines.length > 0 ? <Row style={{ justifyContent: 'space-between' }}><Text variant="label" color={INK}>{t('sheet.total')}</Text><Text latin variant="label" color={INK}>{fmt(sheet.total)}</Text></Row> : null}
        </View>

        {sheet.settled.length > 0 ? (
          <View style={{ gap: space.xs }}>
            <Text variant="heading" color={INK}>{t('sheet.settledToday')}</Text>
            {sheet.settled.map((s, i) => <Text key={i} color={INK}>{t('split.pays', { from: s.from, to: s.to, amount: fmt(s.amount) })}</Text>)}
          </View>
        ) : null}

        <View style={{ gap: space.sm }}>
          <Text variant="heading" color={INK}>{t('sheet.whoPays')}</Text>
          {sheet.transfers.length === 0 ? (
            <Row><Icon name="checkmark-circle" size={20} color={GOOD} /><Text color={GOOD} style={{ flex: 1 }}>{t('sheet.square')}</Text></Row>
          ) : sheet.transfers.map((x, i) => <Text key={i} color={INK}>{t('split.pays', { from: x.from, to: x.to, amount: fmt(x.amount) })}</Text>)}
        </View>

        <View style={{ gap: space.xs }}>
          <Text variant="heading" color={INK}>{t('sheet.standing')}</Text>
          {sheet.standing.map((p) => (
            <Row key={p.name} style={{ justifyContent: 'space-between' }}>
              <Text color={INK} style={{ flex: 1 }}>{p.name}</Text>
              <Text variant="small" color={p.net < 0 ? OWE : MUTED}>{p.net > 0 ? t('split.isOwed', { amount: fmt(p.net) }) : p.net < 0 ? t('split.owes', { amount: fmt(-p.net) }) : t('split.settled')}</Text>
            </Row>
          ))}
        </View>
        <Text variant="small" color={MUTED}>{t('sheet.footer')}</Text>
      </View>

      <Button label={t('sheet.shareImage')} icon="image-outline" loading={busy} onPress={() => void shareImage()} />
      <Button kind="secondary" label={t('sheet.shareText')} icon="chatbubble-outline" onPress={() => void shareText()} />
    </Screen>
  );
}

/** The same sheet as plain words, for chats where a picture is not wanted. */
function sheetText(s: DaySheet, t: TFunction, fmt: (n: number) => string): string {
  const lines = [`${s.group} · ${formatDate(s.date)}`, ''];
  if (s.lines.length === 0) lines.push(t('sheet.none'));
  for (const l of s.lines) lines.push(`• ${l.description} ${fmt(l.amount)} (${t('split.paidByLine', { name: l.paidBy })})`);
  if (s.lines.length > 0) lines.push(`${t('sheet.total')}: ${fmt(s.total)}`);
  lines.push('', t('sheet.whoPays'));
  if (s.transfers.length === 0) lines.push(t('sheet.square'));
  for (const x of s.transfers) lines.push(t('split.pays', { from: x.from, to: x.to, amount: fmt(x.amount) }));
  return lines.join('\n');
}
