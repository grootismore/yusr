import { View } from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Card, Field, Icon, Row, Screen, StackHeader, type IconName } from '@/components/ui';
import * as api from '@/data/api';
import { usePlan, useWrite } from '@/data/hooks';
import { FREE, PLUS_SCANS, type PlusFeature } from '@/features/plus/limits';
import { formatDate } from '@/lib/dates';
import { success } from '@/lib/haptics';
import { buyPlus, purchasesReady, redeemStoreCode, restorePurchases, type PurchaseResult } from '@/lib/purchases';
import { toast } from '@/lib/toast';
import { space, useColors } from '@/theme/tokens';

// Only what exists today. (The PDF/CSV summary is left out until it is built.)
const BENEFITS: { key: PlusFeature; icon: IconName }[] = [
  { key: 'scans', icon: 'scan' },
  { key: 'photos', icon: 'image-outline' },
  { key: 'household', icon: 'people-outline' },
  { key: 'history', icon: 'time-outline' },
  { key: 'split', icon: 'swap-horizontal' },
  { key: 'recurring', icon: 'repeat' },
];

/** What Kharadhu Plus adds, what stays free, and how to get it. */
export default function Plus() {
  const colors = useColors();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const plan = usePlan().data;
  const { reason } = useLocalSearchParams<{ reason?: PlusFeature }>();
  const nums = { free: FREE.scans, plus: PLUS_SCANS, recurring: FREE.recurring, groups: FREE.splitGroups, people: FREE.householdPeople, months: FREE.historyMonths };

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const redeem = useWrite((c: string) => api.redeemPromo(c));

  async function applyCode() {
    if (code.replace(/[^A-Za-z0-9]/g, '').length < 6) { setCodeError(t('plus.codeInvalid')); return; }
    setCodeError(null);
    try {
      const r = await redeem.mutateAsync(code);
      await qc.invalidateQueries({ queryKey: ['plan'] });
      setCode('');
      success();
      toast(r.status === 'already_plus' ? t('plus.codeAlready') : t('plus.welcome'));
    } catch (e) {
      const m = String((e as { message?: string })?.message ?? '');
      setCodeError(/too many/i.test(m) ? t('plus.codeTooMany') : t('plus.codeInvalid'));
    }
  }

  async function run(action: () => Promise<PurchaseResult>) {
    const r = await action();
    if (r === 'purchased') { await qc.invalidateQueries({ queryKey: ['plan'] }); success(); toast(t('plus.welcome')); }
    else if (r === 'unavailable') toast(t('plus.soon'));
    else if (r === 'failed') toast(t('plus.failed'), 'error');
  }

  return (
    <Screen>
      <StackHeader title={t('plus.title')} />
      <Text color={colors.inkMuted}>{t('plus.intro')}</Text>

      {reason && BENEFITS.some((b) => b.key === reason) ? <Card tone="warn"><Row><Icon name="lock-closed-outline" color={colors.amberDeep} /><Text style={{ flex: 1 }}>{t(`plus.reason.${reason}`, nums)}</Text></Row></Card> : null}

      {plan?.plus ? (
        <Card tone="good">
          <Row><Icon name="checkmark-circle" color={colors.accent} /><Text variant="heading" style={{ flex: 1 }}>{t('plus.active')}</Text></Row>
          {plan.expiresAt ? <Text color={colors.inkMuted}>{t('plus.until', { date: formatDate(plan.expiresAt.slice(0, 10)) })}</Text> : null}
        </Card>
      ) : null}

      <Card>
        <Text variant="heading">{t('plus.freeTitle')}</Text>
        <Text color={colors.inkMuted}>{t('plus.freeBody', nums)}</Text>
      </Card>

      <Text variant="heading">{t('plus.adds')}</Text>
      <Card>
        {BENEFITS.map((b) => (
          <Row key={b.key} style={{ alignItems: 'flex-start', paddingVertical: space.xs }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentWash, alignItems: 'center', justifyContent: 'center' }}><Icon name={b.icon} color={colors.accent} /></View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text>{t(`plus.benefit.${b.key}`, nums)}</Text>
              <Text variant="small" color={colors.inkMuted}>{t(`plus.benefitNote.${b.key}`, nums)}</Text>
            </View>
          </Row>
        ))}
      </Card>

      {plan?.plus ? null : purchasesReady() ? (
        <>
          <Button label={t('plus.get')} icon="sparkles-outline" onPress={() => void run(buyPlus)} />
          <Button kind="ghost" label={t('plus.restore')} onPress={() => void run(restorePurchases)} />
          <Text variant="small" color={colors.inkMuted}>{t('plus.priceNote')}</Text>
        </>
      ) : (
        // Store purchases are not set up yet, so there is no button that cannot finish. A promotion code works now.
        <Card tone="good"><Text>{t('plus.notOnSale')}</Text></Card>
      )}

      <Card>
        <Text variant="heading">{t('plus.haveCode')}</Text>
        <Field label={t('plus.codeLabel')} hint={t('plus.codeHint')} value={code} onChangeText={(v) => { setCode(v.toUpperCase()); setCodeError(null); }} autoCapitalize="characters" autoCorrect={false} maxLength={14} error={codeError} />
        <Button kind="secondary" label={t('plus.useCode')} loading={redeem.isPending} onPress={() => void applyCode()} />
        {plan?.plus || !purchasesReady() ? null : <Button kind="ghost" label={t('plus.storeCode')} onPress={() => void run(redeemStoreCode)} />}
      </Card>

    </Screen>
  );
}
