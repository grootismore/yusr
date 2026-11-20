import { useState } from 'react';
import { Share } from 'react-native';
import { confirmDialog } from '@/lib/dialog';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { DateField } from '@/components/DateField';
import { Money } from '@/components/Money';
import { Msg } from '@/components/Msg';
import { Text } from '@/components/Text';
import { Button, Card, Field, ProgressBar, Row, Screen, StackHeader } from '@/components/ui';
import * as api from '@/data/api';
import { useIous, useIouPayments, useWrite } from '@/data/hooks';
import { nudgeDates, nudgeMessage, paidOf, remaining, roleOf, statusOf, timeline } from '@/features/ious/logic';
import { IouTimeline, StatusPill } from '@/features/ious/ui';
import { useAuth } from '@/lib/auth';
import { formatDate, parseDate, today } from '@/lib/dates';
import { success } from '@/lib/haptics';
import { formatNumber, parseAmount } from '@/lib/money';
import { toast } from '@/lib/toast';
import { space, useColors } from '@/theme/tokens';

/** One IOU: where it stands, its timeline, a payment form, and the reminders. */
export default function Iou() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const me = useAuth().userId ?? '';
  const { id } = useLocalSearchParams<{ id?: string }>();
  const iou = useIous().data?.find((i) => i.id === id);
  const all = useIouPayments().data;
  const addPayment = useWrite(api.addIouPayment);
  const delPayment = useWrite(api.deleteIouPayment);
  const delIou = useWrite(api.deleteIou);
  const leave = useWrite(api.leaveIou);
  const [amount, setAmount] = useState('');
  const [paidOn, setPaidOn] = useState(formatDate(today()));
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<{ amount?: string; date?: string }>({});
  if (!iou) return <Screen><StackHeader title={t('ious.title')} /><Text>{t('common.loading')}</Text></Screen>;

  const payments = (all ?? []).filter((p) => p.iou_id === iou.id);
  const left = remaining(iou, payments);
  const role = roleOf(iou, me);
  const mine = iou.user_id === me;
  const name = mine ? iou.person_name : t('ious.other');
  const status = statusOf(iou, payments, today());
  const percent = Math.min(100, Math.floor((paidOf(payments) * 100) / iou.amount_laari));
  const events = timeline(iou, payments, today());
  const next = nudgeDates(iou.due_on, today())[0];

  async function pay() {
    const e: { amount?: string; date?: string } = {};
    let laari = 0;
    try { laari = parseAmount(amount); if (laari <= 0) throw new Error('x'); } catch { e.amount = t('expense.invalidAmount'); }
    const date = parseDate(paidOn);
    if (!date) e.date = t('expense.invalidDate');
    setErrors(e);
    if (Object.keys(e).length || !iou) return;
    await addPayment.mutateAsync({ iou_id: iou.id, amount_laari: laari, paid_on: date!, note: note.trim() || null, created_by: me });
    success();
    toast(t('ious.paymentSaved'));
    setAmount(''); setNote('');
  }

  async function remind() {
    if (!iou) return;
    const amountText = `MVR ${formatNumber(left)}`;
    const message = nudgeMessage({ name: iou.person_name, amountText, title: iou.title, due: iou.due_on, dueText: iou.due_on ? formatDate(iou.due_on) : '', text: { due: t('ious.msg.due'), open: t('ious.msg.open') } });
    try { await Share.share({ message }); } catch { /* the person closed the share sheet */ }
  }

  return (
    <Screen>
      <StackHeader title={name} />
      <Card tone="hero" style={{ gap: space.md }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text color={colors.onHero}>{t(left === 0 ? 'ious.paidInFullShort' : role === 'lent' ? 'ious.theyOwe' : 'ious.youOweShort')}</Text>
          <StatusPill status={status} />
        </Row>
        <Money laari={left === 0 ? iou.amount_laari : left} variant="display" color={colors.onHero} />
        <ProgressBar onHero percent={percent} state="ok" label={t('a11y.progress', { percent })} />
        <Msg k="ious.ofTotal" amounts={{ paid: paidOf(payments), total: iou.amount_laari }} color={colors.onHero} variant="small" />
        {iou.title ? <Text color={colors.onHero}>{iou.title}</Text> : null}
        {iou.due_on ? <Text variant="small" color={colors.onHero}>{t('ious.dueOnLine', { date: formatDate(iou.due_on) })}</Text> : null}
      </Card>

      {left > 0 ? (
        <Card style={{ gap: space.md }}>
          <Text variant="title">{t('ious.recordPayment')}</Text>
          <Field label={`${t('ious.amount')} (MVR)`} value={amount} onChangeText={(v) => { setAmount(v); setErrors({}); }} keyboardType="decimal-pad" placeholder="0.00" error={errors.amount} style={{ fontSize: 24 }} />
          <DateField label={t('ious.date')} value={paidOn} onChangeText={setPaidOn} error={errors.date} />
          <Field label={`${t('ious.note')} (${t('common.optional')})`} value={note} onChangeText={setNote} maxLength={120} />
          <Row style={{ flexWrap: 'wrap' }}>
            <Button label={t('ious.savePayment')} onPress={pay} loading={addPayment.isPending} />
            <Button kind="secondary" label={t('ious.payAll')} onPress={() => setAmount(formatNumber(left).replace(/,/g, ''))} />
          </Row>
        </Card>
      ) : null}

      <Card style={{ gap: space.md }}>
        <Text variant="title">{t('ious.timeline')}</Text>
        <IouTimeline events={events} overdue={status === 'overdue'} names={(by) => (by === me ? t('ious.you') : name)} />
      </Card>

      {payments.some((p) => p.created_by === me) ? (
        <Card style={{ gap: space.sm }}>
          <Text variant="title">{t('ious.yourPayments')}</Text>
          {payments.filter((p) => p.created_by === me).map((p) => (
            <Row key={p.id} style={{ justifyContent: 'space-between' }}>
              <Msg k="ious.paymentLine" amounts={{ amount: p.amount_laari }} values={{ date: formatDate(p.paid_on) }} />
              <Button kind="ghost" label={t('common.remove')} onPress={async () => { if (await confirmDialog({ title: t('ious.removePaymentTitle'), message: t('ious.removePaymentBody'), confirmLabel: t('common.remove'), cancelLabel: t('common.cancel'), destructive: true })) await delPayment.mutateAsync(p.id); }} />
            </Row>
          ))}
        </Card>
      ) : null}

      {mine ? (
        <Card style={{ gap: space.sm }}>
          <Text variant="title">{t('ious.nudge.title')}</Text>
          <Text color={colors.inkMuted}>{t(`ious.nudge.${iou.nudge}Note`, { name })}</Text>
          {iou.nudge !== 'off' && left > 0 && next ? <Text variant="small" color={colors.inkMuted}>{t('ious.nextReminder', { date: formatDate(next) })}</Text> : null}
          {role === 'lent' && left > 0 ? <Button kind="secondary" icon="share-outline" label={t('ious.sendReminder')} onPress={remind} /> : null}
        </Card>
      ) : null}

      <Row style={{ flexWrap: 'wrap' }}>
        {mine ? <Button kind="secondary" label={t('common.edit')} onPress={() => router.push({ pathname: '/iou-edit', params: { id: iou.id } })} /> : null}
        {mine ? (
          <Button kind="danger" label={t('ious.delete')} onPress={async () => { if (await confirmDialog({ title: t('ious.deleteTitle'), message: t('ious.deleteBody'), confirmLabel: t('ious.delete'), cancelLabel: t('common.cancel'), destructive: true })) { await delIou.mutateAsync(iou.id); router.back(); } }} />
        ) : (
          <Button kind="danger" label={t('ious.leave')} onPress={async () => { if (await confirmDialog({ title: t('ious.leaveTitle'), message: t('ious.leaveBody'), confirmLabel: t('ious.leave'), cancelLabel: t('common.cancel'), destructive: true })) { await leave.mutateAsync(iou.id); router.back(); } }} />
        )}
      </Row>
    </Screen>
  );
}
