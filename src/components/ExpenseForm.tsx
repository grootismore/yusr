import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { type Category, type NewExpense } from '@/data/types';
import { useCategoryName, useRates } from '@/data/hooks';
import { DateField } from './DateField';
import { addDays, formatDate, parseDate, today } from '@/lib/dates';
import { formatNumber, ltr, parseAmount, parseRate, toMvrLaari } from '@/lib/money';
import { isLow, type Confidence } from '@/lib/receipt';
import { space, useColors } from '@/theme/tokens';
import { Msg } from './Msg';
import { Text } from './Text';
import { Button, Chip, Field, Icon, Row, SettingRow, type IconName } from './ui';

export const CURRENCIES = ['MVR', 'USD'];

export interface FormInitial {
  amountLaari?: number | null; currency?: string; rate?: string | null; category_id?: string | null; merchant?: string | null; date?: string | null; note?: string | null;
}

/**
 * Shared by Add expense and Confirm. Every field is editable; in Confirm, fields the scanner was
 * unsure about (`confidence` below 0.7) get a flagged style and words, not just a colour.
 * `children` renders extra sections (items, GST) between the category and the save button.
 */
export function ExpenseForm({ initial = {}, categories, confidence, onSubmit, submitLabel, busy, children, onTotalChange, income, hideAmount, offerKeep, initialKeep = false, compact }: {
  initial?: FormInitial; categories: Category[]; confidence?: Confidence; onSubmit: (e: NewExpense) => void; submitLabel: string; busy?: boolean;
  children?: ReactNode; onTotalChange?: (laari: number | null) => void;
  /** Money coming in: no category or merchant, and the note says where it is from. */
  income?: boolean;
  /** The amount was already typed on the keypad; show everything else. */
  hideAmount?: boolean;
  /** Foreign income can be kept in its currency: shows the switch and returns the choice as `keep_in_currency`. */
  offerKeep?: boolean; initialKeep?: boolean;
  /** Show only what is needed (category, or the note for income) with everything else under "More options". Editing keeps the full form. */
  compact?: boolean;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  const catName = useCategoryName();
  const { data: rates = {} } = useRates();

  const [amount, setAmount] = useState(initial.amountLaari != null ? formatNumber(initial.amountLaari).replace(/,/g, '') : '');
  const [currency, setCurrency] = useState(initial.currency ?? 'MVR');
  const [rateText, setRateText] = useState<string | null>(initial.currency && initial.currency !== 'MVR' && initial.rate ? String(Number(initial.rate)) : null);
  const [categoryId, setCategoryId] = useState<string | null>(initial.category_id ?? null);
  const needsCategory = !income && !categoryId; // Save waits for a category, so no error message is needed
  const [merchant, setMerchant] = useState(initial.merchant ?? '');
  const [date, setDate] = useState(formatDate(initial.date ?? today()));
  const [note, setNote] = useState(initial.note ?? '');
  const [keep, setKeep] = useState(initialKeep);
  const [more, setMore] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const rate = currency === 'MVR' ? '1' : (rateText ?? rates[currency] ?? '');
  const minor = useMemo(() => { try { return parseAmount(amount); } catch { return null; } }, [amount]);
  useEffect(() => onTotalChange?.(minor), [minor, onTotalChange]);
  const mvr = useMemo(() => { try { return currency === 'MVR' || minor === null ? null : toMvrLaari(minor, rate); } catch { return null; } }, [currency, minor, rate]);
  const flag = (k: keyof Confidence) => (confidence ? isLow(confidence[k]) : false);
  const codes = [...new Set([...CURRENCIES, currency, ...Object.keys(rates)])];

  function submit() {
    const next: Record<string, string> = {};
    if (minor === null || minor <= 0) next.amount = t('expense.invalidAmount');
    const iso = parseDate(date);
    if (!iso) next.date = t('expense.invalidDate');
    if (currency !== 'MVR') { try { parseRate(rate); } catch { next.rate = t('expense.invalidRate'); } }
    if (!income && !categoryId) next.category = t('expense.chooseCategory');
    setErrors(next);
    if (next.rate || next.date) setMore(true); // the problem is in a part that is tucked away: show it
    if (Object.keys(next).length) return;
    onSubmit({ amount_laari: minor!, currency, fx_rate_to_mvr: currency === 'MVR' ? '1' : rate.trim(), category_id: income ? null : categoryId, merchant: income ? null : merchant.trim() || null, spent_at: iso!, note: note.trim() || null, ...(offerKeep && income ? { keep_in_currency: currency !== 'MVR' && keep } : {}) });
  }

  // Each part of the form, so a compact form can show the few that matter and tuck the rest under "More options".
  const amountBlock = (
    <>
      {hideAmount ? null : <Field label={t('expense.amount')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" error={errors.amount} flag={flag('total')} style={{ fontSize: 24 }} />}
    </>
  );
  const currencyBlock = (
    <>
      <View style={{ gap: space.sm }}>
        <Text variant="label">{t('expense.currency')}</Text>
        <Row style={{ flexWrap: 'wrap' }}>{codes.map((c) => <Chip key={c} label={c} selected={c === currency} onPress={() => { setCurrency(c); setRateText(null); }} />)}</Row>
      </View>
      {currency !== 'MVR' ? (
        <View style={{ gap: space.sm }}>
          <Field label={t('expense.rate')} hint={t('expense.rateHint', { code: ltr(currency) })} value={rate} onChangeText={setRateText} keyboardType="decimal-pad" placeholder={t('settings.ratePlaceholder')} error={errors.rate} />
          {mvr !== null ? <Msg k="expense.mvrValue" amounts={{ amount: mvr }} color={colors.inkMuted} /> : null}
        </View>
      ) : null}
    </>
  );
  const categoryBlock = (
    <>
      {income ? null : <View style={{ gap: space.sm }}>
        <Text variant="label">{t('expense.category')}</Text>
        <Row style={{ flexWrap: 'wrap' }}>
          {categories.map((c) => <Chip key={c.id} label={catName(c)} icon={c.icon as IconName} selected={c.id === categoryId} onPress={() => setCategoryId(c.id)} />)}
        </Row>
        {flag('category') && !errors.category ? <Row><Icon name="alert-circle" size={18} color={colors.amberDeep} /><Text variant="small">{t('confirm.checkThis')} — {t('confirm.lowConfidence')}</Text></Row> : null}
        {needsCategory && !flag('category') ? <Text variant="small" color={colors.inkMuted}>{t('expense.pickCategory')}</Text> : null}
        {errors.category ? <Text variant="small" color={colors.coral}>{errors.category}</Text> : null}
      </View>}
    </>
  );
  const merchantBlock = (
    <>
      {income ? null : <Field label={t('expense.merchant')} value={merchant} onChangeText={setMerchant} flag={flag('merchant')} autoCapitalize="words" />}
    </>
  );
  const dateBlock = (
      <View style={{ gap: space.sm }}>
        <DateField label={t('expense.date')} hint={t('expense.dateHint')} value={date} onChangeText={setDate} error={errors.date} flag={flag('date')} />
        <Row>
          <Chip label={t('common.today')} onPress={() => setDate(formatDate(today()))} />
          <Chip label={t('common.yesterday')} onPress={() => setDate(formatDate(addDays(today(), -1)))} />
        </Row>
      </View>
  );
  const noteBlock = (
      <Field label={`${income ? t('income.noteLabel') : t('expense.note')} (${t('common.optional')})`} value={note} onChangeText={setNote} multiline />
  );
  const keepBlock = (
    <>
      {offerKeep && income && currency !== 'MVR' ? <SettingRow icon="wallet-outline" title={t('foreign.keep', { currency })} subtitle={t('foreign.keepNote')} value={keep} onValueChange={setKeep} last /> : null}
    </>
  );
  const save = <Button label={submitLabel} onPress={submit} loading={busy} disabled={needsCategory} />;

  if (compact) {
    return (
      <View style={{ gap: space.lg }}>
        {amountBlock}
        {categoryBlock}
        {income ? noteBlock : null}
        <Button kind="ghost" label={t(more ? 'add.fewerOptions' : 'add.moreOptions')} icon={more ? 'chevron-up' : 'chevron-down'} onPress={() => setMore(!more)} />
        {more ? (
          <>
            {currencyBlock}
            {merchantBlock}
            {dateBlock}
            {income ? null : noteBlock}
            {keepBlock}
            {children}
          </>
        ) : null}
        {save}
      </View>
    );
  }

  return (
    <View style={{ gap: space.lg }}>
      {amountBlock}
      {currencyBlock}
      {categoryBlock}
      {merchantBlock}
      {dateBlock}
      {noteBlock}
      {keepBlock}
      {children}
      {save}
    </View>
  );
}
