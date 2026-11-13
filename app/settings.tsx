import { useEffect, useState } from 'react';
import { Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CURRENCIES } from '@/components/ExpenseForm';
import { Text } from '@/components/Text';
import { DeleteAccountCard } from '@/features/account/DeleteAccountCard';
import { Button, Card, Chip, Field, Row, Screen } from '@/components/ui';
import * as api from '@/data/api';
import { useProfile, useRates, useWrite } from '@/data/hooks';
import { LANGUAGES, LANGUAGE_NAMES, setLanguage, type Language } from '@/lib/i18n';
import { biometricAvailable, biometricEnabled, setBiometricEnabled } from '@/lib/lock';
import { ltr, parseRate } from '@/lib/money';
import { colors, space } from '@/theme/tokens';

function RateField({ code, value }: { code: string; value: string }) {
  const { t } = useTranslation();
  const [text, setText] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const save = useWrite((r: string) => api.saveRate(code, r));
  return (
    <Field
      label={ltr(`1 ${code} = ? MVR`)} value={text} onChangeText={setText} keyboardType="decimal-pad" placeholder={t('settings.ratePlaceholder')} error={error}
      onEndEditing={() => {
        if (!text.trim()) { setError(null); return; }
        try { parseRate(text); setError(null); save.mutate(text.trim()); } catch { setError(t('expense.invalidRate')); }
      }}
    />
  );
}

export default function Settings() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const profile = useProfile().data;
  const rates = useRates().data ?? {};
  const updateProfile = useWrite(api.updateProfile);
  const [bio, setBio] = useState(false);
  const [bioOk, setBioOk] = useState(true);
  useEffect(() => { void biometricEnabled().then(setBio); void biometricAvailable().then(setBioOk); }, []);

  async function pickLanguage(l: Language) {
    if (l === i18n.language) return;
    await setLanguage(l); // shows the restart screen if the direction changes
    updateProfile.mutate({ language: l });
  }

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="title">{t('settings.title')}</Text>
        <Button kind="ghost" label={t('common.done')} onPress={() => router.back()} />
      </Row>

      <Card>
        <Text variant="heading">{t('settings.language')}</Text>
        <Row style={{ flexWrap: 'wrap' }}>{LANGUAGES.map((l) => <Chip key={l} label={LANGUAGE_NAMES[l]} selected={i18n.language === l} onPress={() => pickLanguage(l)} />)}</Row>
      </Card>

      <Card>
        <Text variant="heading">{t('settings.baseCurrency')}</Text>
        <Text color={colors.inkMuted}>{t('settings.baseCurrencyNote')}</Text>
      </Card>

      <Card>
        <Text variant="heading">{t('settings.rates')}</Text>
        <Text variant="small" color={colors.inkMuted}>{t('settings.ratesNote')}</Text>
        {CURRENCIES.filter((c) => c !== 'MVR').map((c) => <RateField key={`${c}-${rates[c] ?? ''}`} code={c} value={rates[c] ?? ''} />)}
      </Card>

      <DeleteAccountCard />

      <Card>
        <Text variant="heading">{t('settings.security')}</Text>
        <Row style={{ minHeight: 52 }}>
          <Text style={{ flex: 1 }}>{t('settings.biometric')}</Text>
          <Switch accessibilityLabel={t('settings.biometric')} value={bio} disabled={!bioOk} trackColor={{ true: colors.teal, false: colors.control }} onValueChange={async (v) => { setBio(v); await setBiometricEnabled(v); }} />
        </Row>
        {!bioOk ? <Text variant="small" color={colors.inkMuted}>{t('settings.biometricUnavailable')}</Text> : null}
        <View style={{ height: space.xs }} />
        <Row style={{ minHeight: 52 }}>
          <View style={{ flex: 1 }}>
            <Text>{t('settings.keepPhotos')}</Text>
            <Text variant="small" color={colors.inkMuted}>{t('settings.keepPhotosNote')}</Text>
          </View>
          <Switch accessibilityLabel={t('settings.keepPhotos')} value={!!profile?.keep_receipt_images} trackColor={{ true: colors.teal, false: colors.control }} onValueChange={(v) => updateProfile.mutate({ keep_receipt_images: v })} />
        </Row>
      </Card>
    </Screen>
  );
}
