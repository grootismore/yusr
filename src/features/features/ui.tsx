import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Card, SettingRow } from '@/components/ui';
import { toast } from '@/lib/toast';
import { space, useColors } from '@/theme/tokens';
import { setFeature, useFeatureStates } from './hooks';
import { FEATURES, GROUPS } from './registry';

/** The grouped on/off list of optional features, used by the Features screen and the first-time setup. */
export function FeatureSwitches() {
  const colors = useColors();
  const { t } = useTranslation();
  const on = useFeatureStates();
  return (
    <>
      {GROUPS.map((g) => {
        const rows = FEATURES.filter((f) => f.group === g);
        return (
          <View key={g} style={{ gap: space.sm }}>
            <Text variant="heading">{t(`features.groups.${g}`)}</Text>
            <Card style={{ paddingVertical: space.xs }}>
              {rows.map((f, i) => (
                <SettingRow key={f.id} icon={f.icon} title={t(f.title)} subtitle={t(`features.desc.${f.id}`)} value={on[f.id]} onValueChange={(v) => { void setFeature(f.id, v); if (!v) toast(t('features.hidden')); }} last={i === rows.length - 1} />
              ))}
            </Card>
          </View>
        );
      })}
      <Text variant="small" color={colors.inkMuted}>{t('features.note')}</Text>
    </>
  );
}
