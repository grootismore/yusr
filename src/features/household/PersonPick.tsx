import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Chip, Row } from '@/components/ui';
import { useHousehold } from '@/data/hooks';
import { space } from '@/theme/tokens';

/** Pick which person in the household something belongs to. With `everyone`, it can also belong to no one in particular. */
export function PersonPick({ label, value, onChange, everyone }: { label: string; value: string | null; onChange: (userId: string | null) => void; everyone?: boolean }) {
  const { t } = useTranslation();
  const members = useHousehold().data?.members ?? [];
  if (members.length === 0) return null;
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="label">{label}</Text>
      <Row style={{ flexWrap: 'wrap' }}>
        {everyone ? <Chip label={t('household.everyone')} selected={value === null} onPress={() => onChange(null)} /> : null}
        {members.map((m) => <Chip key={m.user_id} label={m.display_name} selected={value === m.user_id} onPress={() => onChange(m.user_id)} />)}
      </Row>
    </View>
  );
}
