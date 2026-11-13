import { useState } from 'react';
import { Share, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Card, Field, Row, Screen } from '@/components/ui';
import * as api from '@/data/api';
import { useWrite } from '@/data/hooks';
import { success } from '@/lib/haptics';
import { useColors } from '@/theme/tokens';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function ContactInvite() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const invite = useWrite(api.inviteContact);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [as, setAs] = useState('');
  const [consent, setConsent] = useState(false); // unticked by default: a separate, explicit choice
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [link, setLink] = useState<string | null>(null);
  const baseUrl = process.env.EXPO_PUBLIC_APP_URL ?? '';

  async function submit() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t('contacts.needName');
    if (!EMAIL.test(email.trim())) e.email = t('contacts.needEmail');
    if (!consent) e.consent = t('contacts.consentNeeded');
    if (!baseUrl && process.env.EXPO_PUBLIC_PREVIEW !== '1') e.consent = t('contacts.appUrlMissing');
    setErrors(e);
    if (Object.keys(e).length) return;
    setLink(await invite.mutateAsync({ name: name.trim(), email, phone: phone.trim() || null, inviterName: as.trim() || null, baseUrl: baseUrl || 'https://example.invalid' }));
    success();
  }

  if (link) {
    return (
      <Screen>
        <Text variant="title">{t('contacts.created')}</Text>
        <Card tone="good"><Text>{t('contacts.linkNote')}</Text></Card>
        <Button icon="share-outline" label={t('contacts.share')} onPress={() => Share.share({ message: t('contacts.shareText', { who: as.trim() || t('accept.someone'), link }) })} />
        <Button kind="ghost" label={t('common.done')} onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="title" style={{ flex: 1 }}>{t('contacts.invite')}</Text>
        <Button kind="ghost" label={t('common.cancel')} onPress={() => router.back()} />
      </Row>
      <Field label={t('contacts.name')} value={name} onChangeText={setName} error={errors.name} maxLength={100} autoCapitalize="words" />
      <Field label={t('contacts.email')} value={email} onChangeText={setEmail} error={errors.email} keyboardType="email-address" autoCapitalize="none" maxLength={254} />
      <Field label={`${t('contacts.phone')}`} value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={30} />
      <Field label={`${t('contacts.inviterName')} (${t('common.optional')})`} hint={t('contacts.inviterHint')} value={as} onChangeText={setAs} maxLength={100} />
      <Card>
        <Row style={{ minHeight: 52 }}>
          <Text style={{ flex: 1 }}>{t('contacts.consent')}</Text>
          <Switch accessibilityLabel={t('contacts.consent')} value={consent} onValueChange={setConsent} trackColor={{ true: colors.teal, false: colors.control }} />
        </Row>
        {errors.consent ? <Text variant="small" color={colors.coral} accessibilityLiveRegion="polite">{errors.consent}</Text> : null}
      </Card>
      <View />
      <Button label={t('contacts.sendLink')} onPress={submit} loading={invite.isPending} />
    </Screen>
  );
}
