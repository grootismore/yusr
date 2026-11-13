import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Card, Icon, Row, Screen } from '@/components/ui';
import * as api from '@/data/api';
import { useContacts, useWrite } from '@/data/hooks';
import { useColors } from '@/theme/tokens';

export default function Contacts() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const contacts = (useContacts().data ?? []).filter((c) => c.status !== 'revoked');
  const revoke = useWrite(api.revokeContact);
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="title" style={{ flex: 1 }}>{t('contacts.title')}</Text>
        <Button kind="ghost" label={t('common.back')} onPress={() => router.back()} />
      </Row>
      <Card tone="good"><Text>{t('contacts.intro')}</Text></Card>
      <Card>
        {contacts.length === 0 ? <Text color={colors.inkMuted}>{t('contacts.none')}</Text> : contacts.map((c) => (
          <Row key={c.id} style={{ minHeight: 60 }}>
            <Icon name={c.status === 'accepted' ? 'checkmark-circle' : 'time-outline'} color={c.status === 'accepted' ? colors.teal : colors.inkMuted} />
            <View style={{ flex: 1 }}>
              <Text>{c.name}</Text>
              <Text variant="small" color={colors.inkMuted}>{t(`contacts.status.${c.status}`)}</Text>
            </View>
            <Button kind="ghost" label={t('contacts.revoke')}
              onPress={() => Alert.alert(t('contacts.revokeTitle'), t('contacts.revokeBody'), [{ text: t('common.cancel'), style: 'cancel' }, { text: t('contacts.revoke'), style: 'destructive', onPress: () => revoke.mutate(c.id) }])} />
          </Row>
        ))}
      </Card>
      {contacts.length >= 3 ? <Text color={colors.inkMuted}>{t('contacts.max')}</Text>
        : <Button icon="person-add-outline" label={t('contacts.invite')} onPress={() => router.push('/contact-invite')} />}
    </Screen>
  );
}
