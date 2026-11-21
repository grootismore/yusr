import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Msg } from '@/components/Msg';
import { Text } from '@/components/Text';
import { formatDate } from '@/lib/dates';
import { radius, space, useColors } from '@/theme/tokens';
import type { PersonEvent, Status, TimelineEvent } from './logic';

/** A small coloured word for where an IOU stands. */
export function StatusPill({ status }: { status: Status }) {
  const colors = useColors();
  const { t } = useTranslation();
  const tone = status === 'overdue' ? colors.coral : status === 'dueSoon' ? colors.amberDeep : status === 'settled' ? colors.accent : colors.inkMuted;
  return (
    <View style={{ borderWidth: 1, borderColor: tone, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2 }}>
      <Text variant="small" color={tone}>{t(`ious.status.${status}`)}</Text>
    </View>
  );
}

/** The IOU's story top to bottom: the loan, each payment and the due date, with what is left after each. */
export function IouTimeline({ events, names, overdue }: { events: TimelineEvent[]; names: (createdBy?: string) => string; overdue: boolean }) {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <View>
      {events.map((e, i) => {
        const last = i === events.length - 1;
        const tone = e.kind === 'due' ? (overdue ? colors.coral : colors.amberDeep) : colors.accent;
        return (
          <View key={`${e.kind}-${e.paymentId ?? i}`} style={{ flexDirection: 'row', gap: space.md, minHeight: 64 }}>
            <View style={{ alignItems: 'center', width: 18 }}>
              <View style={{ width: 14, height: 14, marginTop: 4, borderRadius: radius.pill, borderWidth: 2, borderColor: tone, backgroundColor: e.future ? 'transparent' : tone }} />
              {!last ? <View style={{ flex: 1, width: 2, backgroundColor: colors.line, marginTop: 2 }} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: space.md, gap: 2 }}>
              <Text variant="small" color={colors.inkMuted} latin style={{ writingDirection: 'ltr' }}>{formatDate(e.date)}</Text>
              {e.kind === 'lent' ? <Msg k="ious.tl.lent" amounts={{ amount: e.amount }} /> : null}
              {e.kind === 'payment' ? <Msg k="ious.tl.paid" values={{ name: names(e.createdBy) }} amounts={{ amount: e.amount }} /> : null}
              {e.kind === 'due' ? <Text color={tone}>{t(e.future ? 'ious.tl.due' : 'ious.tl.wasDue')}</Text> : null}
              {e.kind === 'payment' && e.note ? <Text variant="small" color={colors.inkMuted}>{e.note}</Text> : null}
              <Msg k={e.left === 0 ? 'ious.tl.settled' : 'ious.tl.left'} amounts={{ amount: e.left }} variant="small" color={e.left === 0 ? colors.accent : colors.inkMuted} />
            </View>
          </View>
        );
      })}
      {events.length === 1 ? <Text variant="small" color={colors.inkMuted}>{t('ious.tl.none')}</Text> : null}
    </View>
  );
}

/** Everything with one person in date order, across all their IOUs, with the running balance after each. */
export function PersonTimeline({ events, name }: { events: PersonEvent[]; name: string }) {
  const colors = useColors();
  return (
    <View>
      {events.map((e, i) => {
        const last = i === events.length - 1;
        const give = e.kind === 'lent' || e.kind === 'youPaid';
        return (
          <View key={`${e.date}-${i}`} style={{ flexDirection: 'row', gap: space.md, minHeight: 64 }}>
            <View style={{ alignItems: 'center', width: 18 }}>
              <View style={{ width: 14, height: 14, marginTop: 4, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.accent, backgroundColor: e.future ? 'transparent' : colors.accent }} />
              {!last ? <View style={{ flex: 1, width: 2, backgroundColor: colors.line, marginTop: 2 }} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: space.md, gap: 2 }}>
              <Text variant="small" color={colors.inkMuted} latin style={{ writingDirection: 'ltr' }}>{formatDate(e.date)}</Text>
              <Msg k={`ious.pt.${e.kind}`} values={{ name }} amounts={{ amount: e.amount }} />
              {e.title ? <Text variant="small" color={colors.inkMuted}>{e.title}</Text> : null}
              <Msg k={e.net > 0 ? 'ious.owesYou' : e.net < 0 ? 'ious.youOweThem' : 'ious.pt.even'} values={{ name }} amounts={{ amount: Math.abs(e.net) }} variant="small" color={give ? colors.inkMuted : colors.inkMuted} />
            </View>
          </View>
        );
      })}
    </View>
  );
}
