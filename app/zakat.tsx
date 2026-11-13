import { useState } from 'react';
import { Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Msg } from '@/components/Msg';
import { Text } from '@/components/Text';
import { Button, Card, Chip, Field, Row, Screen } from '@/components/ui';
import * as api from '@/data/api';
import { useWrite, useZakat } from '@/data/hooks';
import { daysBetween, nextHijriOccurrence } from '@/features/giving/hijri';
import { requestNotificationPermission } from '@/features/giving/reminders';
import { formatDate, today } from '@/lib/dates';
import { success } from '@/lib/haptics';
import { formatNumber, parseAmount } from '@/lib/money';
import { space, useColors } from '@/theme/tokens';

export default function Zakat() {
  const { t } = useTranslation();
  const router = useRouter();
  const saved = useZakat().data;
  if (!saved) return <Screen><Text>{t('common.loading')}</Text></Screen>;
  return <ZakatForm initial={saved} onClose={() => router.back()} />;
}

function ZakatForm({ initial, onClose }: { initial: api.ZakatSettings; onClose: () => void }) {
  const colors = useColors();
  const { t } = useTranslation();
  const save = useWrite(api.saveZakat);
  const [goal, setGoal] = useState(initial.sadaqah_goal_laari ? formatNumber(initial.sadaqah_goal_laari).replace(/,/g, '') : '');
  const [month, setMonth] = useState<number | null>(initial.zakat_hijri_month);
  const [day, setDay] = useState(initial.zakat_hijri_day ? String(initial.zakat_hijri_day) : '');
  const [adjust, setAdjust] = useState(initial.hijri_adjustment);
  const [reminder, setReminder] = useState(initial.zakat_reminder);
  const [denied, setDenied] = useState(false);
  const [errors, setErrors] = useState<{ goal?: string; day?: string }>({});
  const months = t('hijriMonths', { returnObjects: true }) as string[];

  const dayNum = Number(day);
  const dayOk = month !== null && Number.isInteger(dayNum) && dayNum >= 1 && dayNum <= 30;
  const next = dayOk ? nextHijriOccurrence(month!, dayNum, today(), adjust) : null;
  const left = next ? daysBetween(today(), next) : null;

  async function toggleReminder(on: boolean) {
    setDenied(false);
    if (on && !(await requestNotificationPermission())) { setDenied(true); setReminder(false); return; }
    setReminder(on);
  }

  async function submit() {
    const e: typeof errors = {};
    let goalLaari: number | null = null;
    if (goal.trim()) { try { goalLaari = parseAmount(goal); if (goalLaari <= 0) throw new Error('x'); } catch { e.goal = t('expense.invalidAmount'); } }
    if (month !== null && !dayOk) e.day = t('zakat.invalidDay');
    setErrors(e);
    if (Object.keys(e).length) return;
    await save.mutateAsync({ sadaqah_goal_laari: goalLaari, zakat_hijri_month: dayOk ? month : null, zakat_hijri_day: dayOk ? dayNum : null, zakat_reminder: reminder && dayOk, hijri_adjustment: adjust });
    success();
    onClose();
  }

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="title" style={{ flex: 1 }}>{t('zakat.title')}</Text>
        <Button kind="ghost" label={t('common.cancel')} onPress={onClose} />
      </Row>
      <Card tone="good"><Text>{t('zakat.guidance')}</Text></Card>

      <Field label={t('zakat.goalLabel')} value={goal} onChangeText={setGoal} keyboardType="decimal-pad" placeholder="0.00" error={errors.goal} />

      <Card>
        <Text variant="heading">{t('zakat.dateTitle')}</Text>
        <Text variant="small" color={colors.inkMuted}>{t('zakat.dateHint')}</Text>
        <Text variant="label">{t('zakat.month')}</Text>
        <Row style={{ flexWrap: 'wrap' }}>{months.map((m, i) => <Chip key={m} label={m} selected={month === i + 1} onPress={() => setMonth(month === i + 1 ? null : i + 1)} />)}</Row>
        <Field label={t('zakat.day')} value={day} onChangeText={setDay} keyboardType="number-pad" error={errors.day} />
        <View style={{ gap: space.sm }}>
          <Text variant="label">{t('zakat.adjust')}</Text>
          <Text variant="small" color={colors.inkMuted}>{t('zakat.adjustHint')}</Text>
          <Row style={{ flexWrap: 'wrap' }}>
            {([[-1, 'minus'], [0, 'zero'], [1, 'plus']] as const).map(([v, k]) => <Chip key={k} label={t(`zakat.adjustValue.${k}`)} selected={adjust === v} onPress={() => setAdjust(v)} />)}
          </Row>
        </View>
        {next ? (
          <View style={{ gap: 2 }}>
            <Msg k="zakat.next" runs={{ date: formatDate(next) }} variant="heading" />
            <Text color={colors.inkMuted}>{left === 0 ? t('zakat.today') : t('zakat.daysLeft', { count: left ?? 0 })}</Text>
          </View>
        ) : null}
      </Card>

      <Card>
        <Row style={{ minHeight: 52 }}>
          <View style={{ flex: 1 }}>
            <Text>{t('zakat.reminder')}</Text>
            <Text variant="small" color={colors.inkMuted}>{t('zakat.reminderNote')}</Text>
          </View>
          <Switch accessibilityLabel={t('zakat.reminder')} value={reminder && dayOk} disabled={!dayOk} onValueChange={toggleReminder} trackColor={{ true: colors.teal, false: colors.control }} />
        </Row>
        {denied ? <Text variant="small" color={colors.inkMuted} accessibilityLiveRegion="polite">{t('zakat.permissionDenied')}</Text> : null}
      </Card>

      <Button label={t('common.save')} onPress={submit} loading={save.isPending} />
    </Screen>
  );
}
