import { useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, Group, Screen } from '@/components/ui';
import { useRequestDeletion } from '@/features/account/hooks';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useColors } from '@/lib/theme';

const ITEMS = ['accounts', 'debts', 'giving', 'register', 'contacts', 'audit', 'login'] as const;

export default function DeleteAccountScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const router = useRouter();
  const { session } = useAuth();
  const request = useRequestDeletion();
  const email = session?.user.email ?? '';
  const [typed, setTyped] = useState('');
  // Typing your own email is the confirmation: it works in any language and cannot be done by accident.
  const confirmed = email !== '' && typed.trim().toLowerCase() === email.toLowerCase();

  function submit() {
    request.mutate(undefined, {
      onSuccess: () => router.back(),
      onError: () => Alert.alert(t('deleteAccount.failedTitle'), t('deleteAccount.failedBody')),
    });
  }

  return (
    <Screen>
      <Text style={{ fontSize: 17, color: colors.text }}>{t('deleteAccount.intro')}</Text>
      <Group title={t('deleteAccount.whatTitle')} footer={t('deleteAccount.graceNote')}>
        {ITEMS.map((item) => (
          <View key={item} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 8 }}>
            <Text style={{ fontSize: 17, color: colors.text }}>{t(`deleteAccount.items.${item}`)}</Text>
          </View>
        ))}
      </Group>
      <Group title={t('deleteAccount.confirmTitle', { email })}>
        <TextInput
          value={typed}
          onChangeText={setTyped}
          accessibilityLabel={t('deleteAccount.confirmLabel')}
          placeholder={email}
          placeholderTextColor={colors.secondaryText}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          style={{ minHeight: 44, paddingHorizontal: 16, fontSize: 17, color: colors.text, textAlign: 'left', writingDirection: 'ltr' }}
        />
      </Group>
      <Button title={t('deleteAccount.submit')} variant="destructive" disabled={!confirmed} busy={request.isPending} onPress={submit} />
      <Button title={t('common.cancel')} onPress={() => router.back()} />
    </Screen>
  );
}
