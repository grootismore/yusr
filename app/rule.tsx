import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Card, Row, Screen, Segmented, SettingRow, StackHeader } from '@/components/ui';
import { useCategories, useCategoryName } from '@/data/hooks';
import { GROUPS, groupOf, type Group } from '@/features/rule/logic';
import { useRule } from '@/features/rule/hooks';
import { setRuleGroup, useRuleGroups } from '@/features/rule/store';
import { RuleCard } from '@/features/rule/ui';
import { monthStart } from '@/lib/dates';
import { setFlag } from '@/lib/flags';
import { space, useColors } from '@/theme/tokens';

export default function Rule() {
  const colors = useColors();
  const { t } = useTranslation();
  const catName = useCategoryName();
  const categories = useCategories().data ?? [];
  const overrides = useRuleGroups();
  const { enabled, income, lines } = useRule(monthStart());
  return (
    <Screen>
      <StackHeader title={t('rule.title')} />
      <Text color={colors.inkMuted}>{t('rule.intro')}</Text>
      <Card style={{ paddingVertical: space.xs }}>
        <SettingRow icon="pie-chart-outline" title={t('rule.use')} subtitle={t('rule.useNote')} value={enabled} onValueChange={(v) => void setFlag('rule503020', v)} last />
      </Card>
      {enabled && !lines.length ? <Card tone="warn"><Text>{t('rule.noIncome')}</Text></Card> : null}
      {enabled ? <RuleCard lines={lines} income={income} link={false} /> : null}
      {enabled ? (
        <Card style={{ gap: space.md }}>
          <Text variant="title">{t('rule.categories')}</Text>
          <Text variant="small" color={colors.inkMuted}>{t('rule.categoriesNote')}</Text>
          {categories.map((c) => {
            const g = groupOf(c, overrides);
            return (
              <View key={c.id} style={{ gap: space.xs }}>
                <Row>
                  <Text style={{ flex: 1 }}>{catName(c)}</Text>
                  {overrides[c.id] ? <Button kind="ghost" label={t('rule.reset')} onPress={() => void setRuleGroup(c.id, null)} /> : null}
                </Row>
                <Segmented<Group> value={g} onChange={(k) => void setRuleGroup(c.id, k)} options={GROUPS.map((k) => ({ key: k, label: t(`rule.short.${k}`) }))} />
              </View>
            );
          })}
        </Card>
      ) : null}
    </Screen>
  );
}
