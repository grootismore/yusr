import { useRef, useState } from 'react';
import { Alert, Share, Switch } from 'react-native';
import { Text } from '@/components/Text';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PreventCapture } from '@/components/PreventCapture';
import { Button, ErrorText, Field, Group, Row, Screen } from '@/components/ui';
import { useInviteContact } from '@/features/transactions/hooks';
import { inviteBaseUrl } from '@/features/wasiyyah/config';
import { buildInviteLink, isPlausibleEmail } from '@/features/wasiyyah/invite';
import { useColors } from '@/lib/theme';

export default function ContactInviteScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const { invite, pending } = useInviteContact();
  const [name, setName] = useState('');
  const [inviterName, setInviterName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false); // never pre-ticked
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const [link, setLink] = useState<string | null>(null);
  const baseUrl = inviteBaseUrl();

  const problem = !name.trim()
    ? t('wasiyyah.nameRequired')
    : !isPlausibleEmail(email)
      ? t('wasiyyah.emailInvalid')
      : !consent
        ? t('wasiyyah.consentRequired')
        : null;

  async function create() {
    if (problem) return setError(problem);
    if (inFlight.current) return; // a second tap while the invite is being created
    inFlight.current = true;
    setError(null);
    try {
      const token = await invite({ name: name.trim(), inviterName: inviterName.trim(), email: email.trim(), phone: phone.trim() });
      setLink(buildInviteLink(baseUrl, token));
    } catch (e) {
      const code = (e as { code?: string })?.code;
      setError(code === '23505' ? t('wasiyyah.duplicate') : code === '23514' ? t('wasiyyah.tooMany') : t('wasiyyah.needOnline'));
    } finally {
      inFlight.current = false;
    }
  }

  if (link) {
    return (
      <Screen>
        <PreventCapture />
        <Stack.Screen options={{ title: t('wasiyyah.linkReady') }} />
        <Text style={{ fontSize: 15, color: colors.secondaryText, paddingHorizontal: 16 }}>{t('wasiyyah.linkHint')}</Text>
        <Group>
          <Row label={link} />
        </Group>
        <Button
          title={t('wasiyyah.sendLink')}
          onPress={() =>
            Share.share({ message: t('wasiyyah.inviteMessage', { name: inviterName.trim() || t('wasiyyah.someone'), link }) }).catch(() =>
              Alert.alert(t('wasiyyah.needOnline')),
            )
          }
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <PreventCapture />
      <Stack.Screen options={{ title: t('wasiyyah.inviteTitle') }} />
      {baseUrl === '' ? <Text style={{ fontSize: 15, color: colors.secondaryText, paddingHorizontal: 16 }}>{t('wasiyyah.notSetUp')}</Text> : null}
      <Group>
        <Field label={t('wasiyyah.theirName')} value={name} onChangeText={setName} maxLength={100} />
        <Field label={t('wasiyyah.theirEmail')} latin value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" maxLength={254} />
        <Field label={t('wasiyyah.theirPhone')} latin value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={30} />
        <Field label={t('wasiyyah.yourName')} value={inviterName} onChangeText={setInviterName} maxLength={100} />
      </Group>
      <Group>
        <Row label={t('wasiyyah.consent')} right={<Switch accessibilityLabel={t('wasiyyah.consent')} value={consent} onValueChange={setConsent} />} />
      </Group>
      <ErrorText>{error}</ErrorText>
      <Button title={pending ? t('wasiyyah.creating') : t('wasiyyah.create')} busy={pending} disabled={baseUrl === ''} onPress={create} />
    </Screen>
  );
}
