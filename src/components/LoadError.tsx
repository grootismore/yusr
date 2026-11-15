import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { space, useColors } from '@/theme/tokens';
import { Text } from './Text';
import { Button, Card, Icon } from './ui';

/** Shown in place of a screen's content when it could not be loaded and nothing is saved on the phone to show instead. */
export function LoadError({ onRetry, busy }: { onRetry: () => void; busy?: boolean }) {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <Card>
      <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.lg }}>
        <Icon name="cloud-offline-outline" size={32} color={colors.inkMuted} />
        <Text variant="heading" style={{ textAlign: 'center' }}>{t('loadError.title')}</Text>
        <Text color={colors.inkMuted} style={{ textAlign: 'center' }}>{t('loadError.body')}</Text>
        <Button kind="secondary" label={t('common.retry')} icon="refresh" onPress={onRetry} loading={busy} />
      </View>
    </Card>
  );
}
