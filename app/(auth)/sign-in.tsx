import { useRef, useState, type ComponentRef } from 'react';
import { Image, ScrollView, TextInput as RNTextInput, View, Pressable } from 'react-native';
import { Text, TextInput } from '@/components/Text';
import { Button } from '@/components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { ConsentList } from '@/features/account/ConsentList';
import { CONSENT_KINDS, signUpConsentMetadata } from '@/features/account/legal';
import { isValidEmail, MIN_PASSWORD_LENGTH } from '@/lib/auth/authErrors';
import { useAuth } from '@/lib/auth/AuthProvider';
import { BRAND, useColors } from '@/lib/theme';

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
  const passwordRef = useRef<ComponentRef<typeof RNTextInput>>(null);
  // Unticked by default, one per document (launch checklist 6).
  const [agreed, setAgreed] = useState<Record<string, boolean>>({});
  const missing = CONSENT_KINDS.filter((kind) => !agreed[kind]).map((kind) => t(`auth.consent.${kind}`)).join(', ');

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
      // The keyboard never covers the field or the button below it; dragging down dismisses it.
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode="interactive"
    >
      <LinearGradient
        colors={BRAND.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 20, padding: 24, alignItems: 'center', gap: 12 }}
      >
        <Image
          source={require('../../assets/icon.png')}
          accessible={false}
          accessibilityIgnoresInvertColors
          style={{ width: 72, height: 72, borderRadius: 18 }}
        />
        <Text accessibilityRole="header" style={{ fontSize: 30, fontWeight: '800', letterSpacing: -0.5, color: '#FFFFFF' }}>
          Yusr
        </Text>
      </LinearGradient>
      <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
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
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <View style={{ height: 0.5, backgroundColor: colors.separator, marginStart: 16 }} />
        <TextInput
          ref={passwordRef}
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
          <ConsentList kinds={CONSENT_KINDS} agreed={agreed} onChange={setAgreed} />
        </>
      ) : null}
      {errorKey ? (
        <Text accessibilityLiveRegion="polite" style={{ fontSize: 15, color: colors.danger, paddingHorizontal: 16 }}>
          {t(errorKey, { items: missing })}
        </Text>
      ) : null}
      {notice ? (
        <Text accessibilityLiveRegion="polite" style={{ fontSize: 15, color: colors.text, paddingHorizontal: 16 }}>
          {t(notice)}
        </Text>
      ) : null}

      <Button title={t(mode === 'signIn' ? 'auth.signIn' : 'auth.signUp')} onPress={submit} busy={busy} />

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
