import { useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams, useNavigation, usePreventRemove, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ExpenseForm } from '@/components/ExpenseForm';
import { Msg } from '@/components/Msg';
import { Text } from '@/components/Text';
import { Button, Card, Field, Icon, Row, Screen } from '@/components/ui';
import { deleteReceiptImage, saveRate, saveScan } from '@/data/api';
import { useCategories, useWrite } from '@/data/hooks';
import { formatNumber, parseAmount } from '@/lib/money';
import { checkTotals, type Draft } from '@/lib/receipt';
import { success } from '@/lib/haptics';
import { space, useColors } from '@/theme/tokens';

const field = (laari: number | null) => (laari == null ? '' : formatNumber(laari).replace(/,/g, ''));
const toLaari = (s: string): number => { try { return parseAmount(s || '0'); } catch { return 0; } };

export default function Confirm() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const { draft: raw, path } = useLocalSearchParams<{ draft: string; path?: string }>();
  const draft: Draft = useMemo(() => JSON.parse(raw), [raw]);
  const categories = useCategories().data ?? [];
  const category = categories.find((c) => c.slug === draft.category_slug)?.id ?? null;

  const [items, setItems] = useState(draft.items.map((i) => ({ name: i.name, qty: String(i.qty), total: field(i.total_laari) })));
  const [gst, setGst] = useState(field(draft.gst_laari));
  const [total, setTotal] = useState<number | null>(draft.total_laari);
  const save = useWrite(saveScan);
  const [done, setDone] = useState(false);

  // Unsaved work in a modal: ask before the back swipe or Android back throws the draft away.
  usePreventRemove(!done, ({ data }) => {
    Alert.alert(t('confirm.leaveTitle'), t('confirm.leaveBody'), [
      { text: t('confirm.leaveStay'), style: 'cancel' },
      { text: t('confirm.leaveDiscard'), style: 'destructive', onPress: () => { if (path) void deleteReceiptImage(path); navigation.dispatch(data.action); } },
    ]);
  });

  useEffect(() => { if (done) router.dismissAll(); }, [done, router]);

  const check = checkTotals({
    items: items.map((i) => toLaari(i.total)), gst: toLaari(gst), service: draft.service_charge_laari ?? 0, discount: draft.discount_laari ?? 0,
    total: total ?? 0, includesGst: draft.prices_include_gst,
  });
  const checkable = items.length > 0 && total !== null;

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="title">{t('confirm.title')}</Text>
        <Button kind="ghost" label={t('confirm.discard')} onPress={() => router.back()} />
      </Row>
      <Text color={colors.inkMuted}>{t('confirm.intro')}</Text>

      {checkable ? (
        <Card tone={check.match ? 'good' : 'warn'}>
          <Row>
            <Icon name={check.match ? 'checkmark-circle' : 'warning'} color={check.match ? colors.accent : colors.amberDeep} />
            <Text variant="label" style={{ flex: 1 }} accessibilityLiveRegion="polite">{check.match ? t('confirm.matchOk') : t('confirm.mismatchTitle')}</Text>
          </Row>
          {!check.match ? <Msg k="confirm.mismatchBody" amounts={{ items: check.itemsSum, gst: toLaari(gst), expected: check.expected, total: total! }} /> : null}
        </Card>
      ) : null}

      <ExpenseForm
        categories={categories}
        initial={{ amountLaari: draft.total_laari, currency: draft.currency, category_id: category, merchant: draft.merchant, date: draft.date }}
        confidence={draft.confidence}
        onTotalChange={setTotal}
        submitLabel={t('confirm.save')}
        busy={save.isPending}
        onSubmit={async (expense) => {
          await save.mutateAsync({
            expense, draft, gstLaari: gst ? toLaari(gst) : null, imagePath: path || null, needsReview: checkable && !check.match,
            items: items.filter((i) => i.name.trim()).map((i) => ({ name: i.name.trim(), qty: Number(i.qty) > 0 ? Number(i.qty) : 1, total_laari: toLaari(i.total) })),
          });
          if (expense.currency !== 'MVR') await saveRate(expense.currency, expense.fx_rate_to_mvr);
          success();
          setDone(true); // the effect below leaves once the leave-guard has been lifted
        }}
      >
        <View style={{ gap: space.md }}>
          <Field label={t('confirm.gst')} value={gst} onChangeText={setGst} keyboardType="decimal-pad" placeholder="0.00" flag={draft.confidence.gst < 0.7 && draft.gst_laari !== null} />
          <Text variant="heading">{t('confirm.items')}</Text>
          {draft.confidence.items < 0.7 && items.length ? <Row><Icon name="alert-circle" size={18} color={colors.amberDeep} /><Text variant="small">{t('confirm.checkThis')} — {t('confirm.lowConfidence')}</Text></Row> : null}
          {items.map((it, i) => (
            <Card key={i}>
              <Field label={t('confirm.itemName')} value={it.name} onChangeText={(v) => setItems(items.map((x, j) => (j === i ? { ...x, name: v } : x)))} />
              <Field label={t('confirm.itemTotal')} value={it.total} onChangeText={(v) => setItems(items.map((x, j) => (j === i ? { ...x, total: v } : x)))} keyboardType="decimal-pad" />
              <Button kind="ghost" label={t('common.remove')} onPress={() => setItems(items.filter((_, j) => j !== i))} />
            </Card>
          ))}
          <Button kind="secondary" icon="add" label={t('confirm.addItem')} onPress={() => setItems([...items, { name: '', qty: '1', total: '' }])} />
        </View>
      </ExpenseForm>
    </Screen>
  );
}
