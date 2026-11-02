import { Alert, View } from 'react-native';
import { Text } from '@/components/Text';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';
import { useFormatDate } from '@/features/transactions/format';
import { useColors } from '@/lib/theme';
import { useCancelDeletion, useDeletionDate } from './hooks';

/** Shown on Home and Settings while an account deletion is scheduled; one tap keeps the account. */
export function DeletionBanner() {
  const { t } = useTranslation();
  const colors = useColors();
  const formatDate = useFormatDate();
  const date = useDeletionDate();
  const cancel = useCancelDeletion();
  if (!date) return null;
  return (
    <View accessibilityRole="alert" style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>{t('deleteAccount.pendingTitle')}</Text>
      <Text style={{ fontSize: 15, color: colors.secondaryText }}>{t('deleteAccount.pendingBody', { date: formatDate(date.slice(0, 10)) })}</Text>
      <Button
        title={t('deleteAccount.keep')}
        busy={cancel.isPending}
        onPress={() => cancel.mutate(undefined, { onError: () => Alert.alert(t('deleteAccount.failedTitle'), t('deleteAccount.failedBody')) })}
      />
    </View>
  );
}
