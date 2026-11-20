import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Msg } from '@/components/Msg';
import { Text } from '@/components/Text';
import { Card, Icon, ProgressBar, type IconName } from '@/components/ui';
import { space, useColors } from '@/theme/tokens';
import type { Group, RuleLine } from './logic';
import { SHARES } from './logic';

const ICON: Record<Group, IconName> = { needs: 'home', wants: 'bag', savings: 'wallet' };

/** The three 50/30/20 bars for the month. Tapping opens the rule's own screen, unless `link` is off (on that screen itself). */
export function RuleCard({ lines, income, link = true }: { lines: RuleLine[]; income: number; link?: boolean }) {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  if (!lines.length) return null;
  const card = (
      <Card style={{ gap: space.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Text variant="title" style={{ flex: 1 }}>{t('rule.title')}</Text>
          <Msg k="rule.ofIncome" amounts={{ amount: income }} variant="small" color={colors.inkMuted} />
        </View>
        {lines.map((l) => <RuleRow key={l.group} line={l} />)}
      </Card>
  );
  if (!link) return card;
  return <Pressable accessibilityRole="button" accessibilityLabel={t('rule.open')} onPress={() => router.push('/rule')}>{card}</Pressable>;
}

function RuleRow({ line }: { line: RuleLine }) {
  const colors = useColors();
  const { t } = useTranslation();
  const bar = line.state === 'reached' ? 'ok' : line.state;
  return (
    <View style={{ gap: space.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Icon name={ICON[line.group]} size={18} color={colors.accent} />
        <Text style={{ flex: 1 }}>{t(`rule.${line.group}`)} · {SHARES[line.group]}%</Text>
      </View>
      <ProgressBar percent={line.percent} state={bar} label={t('a11y.progress', { percent: line.percent })} />
      <Msg k="rule.spentOf" amounts={{ spent: line.spent, target: line.target }} variant="small" color={colors.inkMuted} />
      {line.state === 'over' ? <Msg k="rule.overBy" amounts={{ amount: line.spent - line.target }} variant="small" color={colors.coral} /> : null}
      {line.state === 'reached' ? <Text variant="small" color={colors.accent}>{t('rule.reached')}</Text> : null}
    </View>
  );
}
