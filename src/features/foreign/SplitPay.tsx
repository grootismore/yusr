import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CURRENCIES } from '@/components/ExpenseForm';
import { Money } from '@/components/Money';
import { Text } from '@/components/Text';
import { Button, Card, Chip, Field, Row, SettingRow } from '@/components/ui';
import { useRates } from '@/data/hooks';
import { addDays, formatDate, parseDate, today } from '@/lib/dates';
import { getItem, setItem } from '@/lib/kv';
import { ltr } from '@/lib/money';
import { space, useColors } from '@/theme/tokens';
import { buildSplit, lineMvr, type SplitIncome, type SplitLine } from './logic';

const LAST_KEY = 'kharadhu.lastPayday';
const blank = (currency: string, rate = ''): SplitLine => ({ currency, amount: '', rate, keep: false });

/** A payday in more than one currency: one line per currency, one save. Each foreign line can be kept in that currency. */
export function SplitPay({ busy, onSave }: { busy: boolean; onSave: (rows: SplitIncome[], date: string, note: string | null) => void }) {
  const colors = useColors();
  const { t } = useTranslation();
  const rates = useRates().data ?? {};
  const [lines, setLines] = useState<SplitLine[]>([blank('MVR'), blank('USD')]);
  const [date, setDate] = useState(formatDate(today()));
  const [note, setNote] = useState(t('foreign.noteDefault'));
  const [errors, setErrors] = useState<{ amount?: true; rate?: true }[]>([]);
  const [dateError, setDateError] = useState(false);
  const [last, setLast] = useState<SplitLine[] | null>(null);

  useEffect(() => { void getItem(LAST_KEY).then((v) => { try { if (v) setLast(JSON.parse(v) as SplitLine[]); } catch { /* nothing remembered */ } }); }, []);
  // A foreign line with no rate typed yet takes the last rate the person used for that currency.
  const rateOf = (l: SplitLine) => (l.currency === 'MVR' ? '1' : l.rate || rates[l.currency] || '');
  const effective = lines.map((l) => ({ ...l, rate: rateOf(l) }));
  const total = effective.reduce((s, l) => s + (lineMvr(l) ?? 0), 0);

  const patch = (i: number, p: Partial<SplitLine>) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...p } : l)));

  function submit() {
    const { rows, errors: errs } = buildSplit(effective);
    const iso = parseDate(date);
    setDateError(!iso); setErrors(errs);
    if (!iso || errs.some((e) => e.amount || e.rate) || rows.length === 0) { if (rows.length === 0 && !errs.some((e) => e.amount || e.rate)) setErrors(errs.map(() => ({ amount: true }))); return; }
    void setItem(LAST_KEY, JSON.stringify(effective.map((l) => ({ ...l, amount: '' }))));
    onSave(rows, iso, note.trim() || null);
  }

  return (
    <View style={{ gap: space.lg }}>
      <Text color={colors.inkMuted}>{t('foreign.splitHelp')}</Text>
      {last ? <Row><Button kind="secondary" icon="refresh" label={t('foreign.repeat')} onPress={() => { setLines(last); setErrors([]); }} /></Row> : null}

      {lines.map((l, i) => (
        <Card key={i}>
          <Row style={{ flexWrap: 'wrap' }}>{[...new Set([...CURRENCIES, ...Object.keys(rates)])].map((c) => <Chip key={c} label={c} selected={c === l.currency} onPress={() => patch(i, { currency: c, rate: '', keep: c === 'MVR' ? false : l.keep })} />)}</Row>
          <Field label={t('expense.amount')} value={l.amount} onChangeText={(v) => patch(i, { amount: v })} keyboardType="decimal-pad" placeholder="0.00" error={errors[i]?.amount ? t('expense.invalidAmount') : null} style={{ fontSize: 22 }} />
          {l.currency !== 'MVR' ? (
            <>
              <Field label={t('expense.rate')} hint={t('expense.rateHint', { code: ltr(l.currency) })} value={rateOf(l)} onChangeText={(v) => patch(i, { rate: v })} keyboardType="decimal-pad" error={errors[i]?.rate ? t('expense.invalidRate') : null} />
              <SettingRow icon="wallet-outline" title={t('foreign.keep', { currency: l.currency })} subtitle={t('foreign.keepNote')} value={l.keep} onValueChange={(v) => patch(i, { keep: v })} last />
            </>
          ) : null}
          {lines.length > 1 ? <Row style={{ justifyContent: 'flex-end' }}><Button kind="ghost" icon="trash-outline" label={t('foreign.removeLine')} onPress={() => setLines((ls) => ls.filter((_, k) => k !== i))} /></Row> : null}
        </Card>
      ))}
      <Button kind="secondary" icon="add" label={t('foreign.addLine')} onPress={() => setLines((ls) => [...ls, blank('USD')])} />

      <Card tone="good">
        <Row style={{ justifyContent: 'space-between' }}><Text>{t('foreign.totalMvr')}</Text><Money laari={total} variant="heading" /></Row>
      </Card>

      <View style={{ gap: space.sm }}>
        <Field label={t('expense.date')} hint={t('expense.dateHint')} value={date} onChangeText={(v) => { setDate(v); setDateError(false); }} keyboardType="numbers-and-punctuation" placeholder="DD/MM/YYYY" error={dateError ? t('expense.invalidDate') : null} />
        <Row>
          <Chip label={t('common.today')} onPress={() => setDate(formatDate(today()))} />
          <Chip label={t('common.yesterday')} onPress={() => setDate(formatDate(addDays(today(), -1)))} />
        </Row>
      </View>
      <Field label={`${t('income.noteLabel')} (${t('common.optional')})`} value={note} onChangeText={setNote} />
      <Button label={t('common.save')} onPress={submit} loading={busy} />
    </View>
  );
}
