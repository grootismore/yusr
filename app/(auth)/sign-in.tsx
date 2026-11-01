import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CONSENT_KINDS, legalUrl, signUpConsentMetadata } from '@/features/account/legal';
import { isValidEmail, MIN_PASSWORD_LENGTH } from '@/lib/auth/authErrors';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useColors } from '@/lib/theme';

export default function SignInScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Unticked by default, one per document (launch checklist 6).
  const [agreed, setAgreed] = useState<Record<string, boolean>>({});

  async function submit() {
    setNotice(null);
    if (!isValidEmail(email)) return setErrorKey('auth.errors.invalidEmail');
    if (mode === 'signUp' && password.length < MIN_PASSWORD_LENGTH) return setErrorKey('auth.errors.passwordShort');
    if (mode === 'signIn' && password.length === 0) return setErrorKey('auth.errors.invalidCredentials');
    if (mode === 'signUp' && !CONSENT_KINDS.every((kind) => agreed[kind])) return setErrorKey('auth.errors.consentNeeded');
    setErrorKey(null);
    setBusy(true);
    const result = await (mode === 'signIn' ? signIn(email, password) : signUp(email, password, signUpConsentMetadata()));
    setBusy(false);
    if (result.error) setErrorKey(result.error);
    else if (result.needsEmailConfirmation) {
      setNotice('auth.checkEmail');
      setMode('signIn');
      setPassword('');
      setAgreed({});
    }
  }

  // Email and password are Latin text: keep them left-to-right even in RTL layouts.
  const input = {
    minHeight: 44,
    paddingHorizontal: 16,
    fontSize: 17,
    color: colors.text,
    textAlign: 'left' as const,
    writingDirection: 'ltr' as const,
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={{ backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden' }}>
        <TextInput
          style={input}
          value={email}
          onChangeText={setEmail}
          placeholder={t('auth.email')}
          placeholderTextColor={colors.secondaryText}
          accessibilityLabel={t('auth.email')}
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <View style={{ height: 0.5, backgroundColor: colors.separator, marginStart: 16 }} />
        <TextInput
          style={input}
          value={password}
          onChangeText={setPassword}
          placeholder={t('auth.password')}
          placeholderTextColor={colors.secondaryText}
          accessibilityLabel={t('auth.password')}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
          textContentType={mode === 'signIn' ? 'password' : 'newPassword'}
          returnKeyType="go"
          onSubmitEditing={submit}
        />
      </View>

      {mode === 'signUp' ? (
        <>
          <Text style={{ fontSize: 13, color: colors.secondaryText, paddingHorizontal: 16 }}>{t('auth.passwordHint')}</Text>
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden' }}>
            {CONSENT_KINDS.map((kind, index) => {
              const url = kind === 'age_18' ? null : legalUrl(kind);
              return (
                <View
                  key={kind}
                  style={{
                    minHeight: 44,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderTopWidth: index === 0 ? 0 : 0.5,
                    borderTopColor: colors.separator,
                  }}
                >
                  <Text style={{ flex: 1, fontSize: 15, color: colors.text }}>{t(`auth.consent.${kind}`)}</Text>
                  {url ? (
                    <Pressable accessibilityRole="link" accessibilityLabel={t(`auth.consent.${kind}Read`)} onPress={() => void Linking.openURL(url)} style={{ minHeight: 44, justifyContent: 'center' }}>
                      <Text style={{ fontSize: 15, color: colors.tint }}>{t('auth.consent.read')}</Text>
                    </Pressable>
                  ) : null}
                  <Switch
                    accessibilityLabel={t(`auth.consent.${kind}`)}
                    value={agreed[kind] === true}
                    onValueChange={(value) => setAgreed({ ...agreed, [kind]: value })}
                  />
                </View>
              );
            })}
          </View>
        </>
      ) : null}
      {errorKey ? (
        <Text accessibilityLiveRegion="polite" style={{ fontSize: 15, color: '#C62828', paddingHorizontal: 16 }}>
          {t(errorKey)}
        </Text>
      ) : null}
      {notice ? (
        <Text accessibilityLiveRegion="polite" style={{ fontSize: 15, color: colors.text, paddingHorizontal: 16 }}>
          {t(notice)}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: busy, busy }}
        disabled={busy}
        onPress={submit}
        style={{
          minHeight: 44,
          borderRadius: 12,
          backgroundColor: colors.tint,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: busy ? 0.7 : 1,
        }}
      >
        {busy ? (
          <ActivityIndicator accessibilityLabel={t('auth.loading')} color={colors.background} />
        ) : (
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.background }}>
            {t(mode === 'signIn' ? 'auth.signIn' : 'auth.signUp')}
          </Text>
        )}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setMode(mode === 'signIn' ? 'signUp' : 'signIn');
          setErrorKey(null);
          setNotice(null);
        }}
        style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ fontSize: 15, color: colors.tint }}>
          {t(mode === 'signIn' ? 'auth.switchToSignUp' : 'auth.switchToSignIn')}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
