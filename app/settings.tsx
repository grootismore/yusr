import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CURRENCIES } from '@/components/ExpenseForm';
import { Text } from '@/components/Text';
import { DeleteAccountCard } from '@/features/account/DeleteAccountCard';
import { Card, Chip, Field, ListRow, Row, Screen, SettingRow, StackHeader } from '@/components/ui';
import { setFlag, useFlag } from '@/lib/flags';
import * as api from '@/data/api';
import { usePlan, useProfile, useRates, useWrite } from '@/data/hooks';
import { APPEARANCES, loadAppearance, saveAppearance, type AppearanceChoice } from '@/lib/appearance';
import { LANGUAGES, LANGUAGE_NAMES, setLanguage, type Language } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { biometricAvailable, biometricEnabled, setBiometricEnabled } from '@/lib/lock';
import { clearPin, pinSet } from '@/lib/pin';
import { setHideAmounts, useHideAmounts } from '@/lib/privacy';
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
  const router = useRouter();
  const profile = useProfile().data;
  const plus = usePlan().data?.plus ?? false;
  const thaanaKb = useFlag('thaanaKeyboard');
  const rates = useRates().data ?? {};
  const updateProfile = useWrite(api.updateProfile);
  const [appearance, setAppearance] = useState<AppearanceChoice>('system');
  const [bio, setBio] = useState(false);
  const [bioOk, setBioOk] = useState(true);
  const [pinOn, setPinOn] = useState(false);
  const hideAmounts = useHideAmounts();
  useFocusEffect(useCallback(() => { void pinSet().then(setPinOn); }, []));
  useEffect(() => { void loadAppearance().then(setAppearance); void biometricEnabled().then(setBio); void biometricAvailable().then(setBioOk); }, []);

  async function pickLanguage(l: Language) {
    if (l === i18n.language) return;
    await setLanguage(l);
    updateProfile.mutate({ language: l });
  }

  return (
    <Screen>
      <StackHeader title={t('settings.title')} />
      <Card style={{ paddingVertical: space.xs }}>
        <ListRow icon="options-outline" title={t('features.add')} subtitle={t('features.addNote')} onPress={() => router.push('/features')} last />
      </Card>
      {email ? <Text latin variant="small" color={colors.inkMuted} style={{ marginTop: -space.sm }}>{email}</Text> : null}
        <Card style={{ paddingVertical: space.sm, gap: 0 }}>
          <SettingRow icon="finger-print" title={t('settings.biometric')} subtitle={!bioOk ? t('settings.biometricUnavailable') : undefined} value={bio} disabled={!bioOk}
            onValueChange={async (v) => { setBio(v); await setBiometricEnabled(v); }} />
          <SettingRow icon="keypad-outline" title={t('settings.pin')} subtitle={t('settings.pinNote')} value={pinOn}
            onValueChange={async (v) => { if (v) router.push('/set-pin'); else { setPinOn(false); await clearPin(); } }} />
          <SettingRow icon="eye-off-outline" title={t('settings.hideAmounts')} subtitle={t('settings.hideAmountsNote')} value={hideAmounts} onValueChange={(v) => void setHideAmounts(v)} />
          <SettingRow icon="image-outline" title={t('settings.keepPhotos')} subtitle={plus ? t('settings.keepPhotosNote') : t('plus.benefitNote.photos')} value={plus && !!profile?.keep_receipt_images}
            onValueChange={(v) => (plus ? updateProfile.mutate({ keep_receipt_images: v }) : router.push({ pathname: '/plus', params: { reason: 'photos' } }))} last />
        </Card>

        <Card>
          <Text variant="label" color={colors.inkMuted}>{t('settings.language')}</Text>
          <Row style={{ flexWrap: 'wrap' }}>{LANGUAGES.map((l) => <Chip key={l} label={LANGUAGE_NAMES[l]} selected={i18n.language === l} onPress={() => pickLanguage(l)} />)}</Row>
          {i18n.language === 'dv' ? <SettingRow icon="keypad-outline" title={t('settings.thaanaKeyboard')} subtitle={t('settings.thaanaKeyboardNote')} value={thaanaKb !== false} onValueChange={(v) => void setFlag('thaanaKeyboard', v)} last /> : null}
          <Text variant="label" color={colors.inkMuted}>{t('settings.appearance')}</Text>
          <Row style={{ flexWrap: 'wrap' }}>
            {APPEARANCES.map((a) => <Chip key={a} label={t(`settings.appearanceChoice.${a}`)} selected={appearance === a} onPress={() => { setAppearance(a); void saveAppearance(a); }} />)}
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text variant="label" color={colors.inkMuted}>{t('settings.baseCurrency')}</Text>
            <Text>{t('settings.baseCurrencyNote')}</Text>
          </Row>
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
