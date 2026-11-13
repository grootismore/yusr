import { useState } from 'react';
import { Alert, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Card, Field } from '@/components/ui';
import * as api from '@/data/api';
import { colors } from '@/theme/tokens';

/** Delete my account and everything in it. Used in Settings (app) and on its own page (web). */
export function DeleteAccountCard() {
  const { t } = useTranslation();
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  return (
    <Card>
      <Text variant="heading">{t('deleteAccount.title')}</Text>
      <Text variant="small" color={colors.inkMuted}>{t('deleteAccount.body')}</Text>
      <Field label={t('deleteAccount.typeLabel')} value={confirmText} onChangeText={setConfirmText} autoCapitalize="characters" autoCorrect={false} />
      <Button
        kind="danger" label={t('deleteAccount.confirm')} loading={deleting} disabled={confirmText.trim().toUpperCase() !== t('deleteAccount.type')}
        onPress={async () => { setDeleting(true); try { await api.deleteAccount(); } catch { Alert.alert(t('deleteAccount.failed')); } finally { setDeleting(false); } }}
      />
      <Button kind="ghost" label={t('deleteAccount.privacy')}
        onPress={() => { const base = process.env.EXPO_PUBLIC_LEGAL_URL; if (base) void Linking.openURL(`${base.replace(/\/$/, '')}/privacy`); else Alert.alert(t('deleteAccount.privacyMissing')); }} />
    </Card>
  );
}
