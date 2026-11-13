import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Money } from '@/components/Money';
import { Msg } from '@/components/Msg';
import { Text } from '@/components/Text';
import { Icon, Row } from '@/components/ui';
import { radius, useColors } from '@/theme/tokens';
import type { DueState } from './due';

/** "November 2026" in the current language. Amounts and years stay Latin. */
export function useMonthLabel() {
  const { t } = useTranslation();
  const names = t('months', { returnObjects: true }) as string[];
  return (ym: string) => `${names[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
}

/** Overdue and due-soon say it in words and an icon, never colour alone. Calm wording, no alarm. */
export function DueBadge({ state, days }: { state: DueState; days: number }) {
  const colors = useColors();
  const { t } = useTranslation();
  if (state === 'none' || state === 'ok') return null;
  const bad = state === 'overdue';
  const label = state === 'paid' ? t('debts.due.paid')
    : bad ? t('debts.due.overdue', { count: days })
    : days === 0 ? t('debts.due.today') : t('debts.due.soon', { count: days });
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, borderRadius: radius.pill, borderCurve: 'continuous', backgroundColor: bad ? colors.coralWash : colors.amberWash }}>
      <Icon name={bad ? 'alert-circle' : 'time'} size={14} color={bad ? colors.coral : colors.amberDeep} />
      <Text variant="small" color={bad ? colors.coral : colors.ink}>{label}</Text>
    </View>
  );
}

/** A gentle, factual interest marker. No judgement: it only tells the person what the debt is. */
export function InterestTag({ interestBearing, kind, rateBps }: { interestBearing: boolean; kind: string; rateBps: number | null }) {
  const colors = useColors();
  const { t } = useTranslation();
  if (!interestBearing && kind !== 'qard_hasan') return null;
  const rate = rateBps ? `${(rateBps / 100).toFixed(2).replace(/\.?0+$/, '')}%` : null;
  return (
    <Row style={{ gap: 4 }}>
      <Icon name={interestBearing ? 'information-circle-outline' : 'heart-outline'} size={16} color={colors.inkMuted} />
      {interestBearing
        ? (rate ? <Msg k="debts.interestRate" runs={{ rate }} variant="small" color={colors.inkMuted} /> : <Text variant="small" color={colors.inkMuted}>{t('debts.interest')}</Text>)
        : <Text variant="small" color={colors.inkMuted}>{t('debts.interestFree')}</Text>}
    </Row>
  );
}

export function DebtAmount({ laari }: { laari: number }) {
  return <Money laari={laari} />;
}
