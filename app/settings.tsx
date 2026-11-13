import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CURRENCIES } from '@/components/ExpenseForm';
import { Text } from '@/components/Text';
import { DeleteAccountCard } from '@/features/account/DeleteAccountCard';
import { Card, Chip, Field, Row, Screen, SettingRow, StackHeader } from '@/components/ui';
import * as api from '@/data/api';
import { useProfile, useRates, useWrite } from '@/data/hooks';
import { APPEARANCES, loadAppearance, saveAppearance, type AppearanceChoice } from '@/lib/appearance';
import { LANGUAGES, LANGUAGE_NAMES, setLanguage, type Language } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { biometricAvailable, biometricEnabled, setBiometricEnabled } from '@/lib/lock';
import { ltr, parseRate } from '@/lib/money';
import { space, useColors } from '@/theme/tokens';

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
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const { email } = useAuth();
  const profile = useProfile().data;
  const rates = useRates().data ?? {};
  const updateProfile = useWrite(api.updateProfile);
  const [appearance, setAppearance] = useState<AppearanceChoice>('system');
  const [bio, setBio] = useState(false);
  const [bioOk, setBioOk] = useState(true);
  useEffect(() => { void loadAppearance().then(setAppearance); void biometricEnabled().then(setBio); void biometricAvailable().then(setBioOk); }, []);

  async function pickLanguage(l: Language) {
    if (l === i18n.language) return;
    await setLanguage(l); // shows the restart screen if the direction changes
    updateProfile.mutate({ language: l });
  }

  return (
    <Screen>
      <StackHeader title={t('settings.title')} />
      {email ? <Text latin variant="small" color={colors.inkMuted} style={{ marginTop: -space.sm }}>{email}</Text> : null}
        <Card style={{ paddingVertical: space.sm, gap: 0 }}>
          <SettingRow icon="finger-print" title={t('settings.biometric')} subtitle={!bioOk ? t('settings.biometricUnavailable') : undefined} value={bio} disabled={!bioOk}
            onValueChange={async (v) => { setBio(v); await setBiometricEnabled(v); }} />
          <SettingRow icon="image-outline" title={t('settings.keepPhotos')} subtitle={t('settings.keepPhotosNote')} value={!!profile?.keep_receipt_images}
            onValueChange={(v) => updateProfile.mutate({ keep_receipt_images: v })} last />
        </Card>

        <Card>
          <Text variant="heading">{t('settings.language')}</Text>
          <Row style={{ flexWrap: 'wrap' }}>{LANGUAGES.map((l) => <Chip key={l} label={LANGUAGE_NAMES[l]} selected={i18n.language === l} onPress={() => pickLanguage(l)} />)}</Row>
        </Card>

        <Card>
          <Text variant="heading">{t('settings.appearance')}</Text>
          <Row style={{ flexWrap: 'wrap' }}>
            {APPEARANCES.map((a) => <Chip key={a} label={t(`settings.appearanceChoice.${a}`)} selected={appearance === a} onPress={() => { setAppearance(a); void saveAppearance(a); }} />)}
          </Row>
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
    </Screen>
  );
}
