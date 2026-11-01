import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PreventCapture } from '@/components/PreventCapture';
import { EmptyState, Group, Row, Screen } from '@/components/ui';
import { useFormatDate } from '@/features/transactions/format';
import { useContacts, useRevokeContact, type TrustedContact } from '@/features/transactions/hooks';
import { toISODate } from '@/features/transactions/logic';

export default function ContactsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const formatDate = useFormatDate();
  const contacts = useContacts().current;
  const { revoke } = useRevokeContact();

  function confirmRevoke(contact: TrustedContact) {
    Alert.alert(t('wasiyyah.revokeTitle'), t('wasiyyah.revokeBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('wasiyyah.revoke'),
        style: 'destructive',
        onPress: () => revoke(contact.id).catch(() => Alert.alert(t('wasiyyah.needOnline'))),
      },
    ]);
  }

  if (contacts.length === 0) {
    return (
      <Screen>
        <PreventCapture />
        <EmptyState
          icon="people-outline"
          title={t('wasiyyah.contactsEmpty')}
          body={t('wasiyyah.contactsEmptyBody')}
          actionLabel={t('wasiyyah.invite')}
          onAction={() => router.push('/more/contact-invite')}
        />
      </Screen>
    );
  }
  return (
    <Screen>
      <PreventCapture />
      <Group title={t('wasiyyah.contactsCount', { count: contacts.length })}>
        {contacts.map((c) => (
          <Row
            key={c.id}
            label={c.name}
            value={
              c.status === 'accepted'
                ? t('wasiyyah.statusAccepted')
                : `${t('wasiyyah.statusInvited')} · ${t('wasiyyah.expires', { date: formatDate(toISODate(new Date(c.invite_expires_at))) })}`
            }
            onPress={() => confirmRevoke(c)}
            accessibilityHint={t('wasiyyah.revoke')}
          />
        ))}
      </Group>
      {contacts.length < 3 ? (
        <Group>
          <Row label={t('wasiyyah.invite')} chevron onPress={() => router.push('/more/contact-invite')} />
        </Group>
      ) : null}
    </Screen>
  );
}
