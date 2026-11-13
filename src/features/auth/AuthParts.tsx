import { useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import { Image, TextInput, View, type TextInputProps } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Field, Icon, IconButton, Row, Screen } from '@/components/ui';
import { MIN_PASSWORD, checkPassword } from '@/lib/authForm';
import { space, useColors } from '@/theme/tokens';

/**
 * Every sign-in screen: the app icon and name centred at the top, a title and one calm line, then the form.
 * A <Footer> as the last child sits at the bottom of the screen when the content is short.
 */
export function AuthScreen({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <Screen grow>
      <View style={{ alignItems: 'center', gap: space.sm, paddingTop: space.lg }}>
        <Image source={require('../../../assets/images/icon.png')} accessible={false} style={{ width: 64, height: 64, borderRadius: 16, borderCurve: 'continuous' }} />
        <Text variant="heading" color={colors.teal}>{t('app.name')}</Text>
      </View>
      <View style={{ gap: space.xs, alignItems: 'center' }}>
        <Text variant="title" accessibilityRole="header" style={{ textAlign: 'center' }}>{title}</Text>
        {subtitle ? <Text color={colors.inkMuted} style={{ textAlign: 'center' }}>{subtitle}</Text> : null}
      </View>
      <View style={{ flex: 1, gap: space.lg }}>{children}</View>
    </Screen>
  );
}

/** A password input with a show/hide button. Always left to right (Field does that for password inputs). */
export function PasswordField({ label, value, onChangeText, error, hint, isNew, inputRef, onSubmitEditing, returnKeyType }: {
  label: string; value: string; onChangeText: (s: string) => void; error?: string | null; hint?: string; isNew?: boolean;
  inputRef?: Ref<ComponentRef<typeof TextInput>>; onSubmitEditing?: TextInputProps['onSubmitEditing']; returnKeyType?: TextInputProps['returnKeyType'];
}) {
  const { t } = useTranslation();
  const [shown, setShown] = useState(false);
  return (
    <Field
      label={label} hint={hint} value={value} onChangeText={onChangeText} error={error} inputRef={inputRef}
      secureTextEntry={!shown} autoCapitalize="none" autoCorrect={false}
      autoComplete={isNew ? 'new-password' : 'current-password'} textContentType={isNew ? 'newPassword' : 'password'}
      returnKeyType={returnKeyType} onSubmitEditing={onSubmitEditing}
      trailing={<IconButton icon={shown ? 'eye-off-outline' : 'eye-outline'} label={shown ? t('auth.hidePassword') : t('auth.showPassword')} onPress={() => setShown(!shown)} />}
    />
  );
}

function Rule({ ok, text }: { ok: boolean; text: string }) {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <Row style={{ gap: space.sm }} accessible accessibilityLabel={`${text}, ${ok ? t('auth.met') : t('auth.notYet')}`}>
      <Icon name={ok ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={ok ? colors.teal : colors.inkMuted} />
      <Text variant="small" color={ok ? colors.ink : colors.inkMuted} style={{ flex: 1 }}>{text}</Text>
    </Row>
  );
}

/** Live, quiet password guidance: the one rule (length) and an optional tip. Nothing red, nothing blocking until they submit. */
export function PasswordRules({ password }: { password: string }) {
  const { t } = useTranslation();
  const c = checkPassword(password);
  return (
    <View style={{ gap: 4 }}>
      <Rule ok={c.longEnough} text={t('auth.ruleLength', { min: MIN_PASSWORD })} />
      <Rule ok={c.mixed} text={t('auth.ruleMixed')} />
    </View>
  );
}

export function Divider({ label }: { label: string }) {
  const colors = useColors();
  return (
    <Row style={{ gap: space.md }}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
      <Text variant="small" color={colors.inkMuted}>{label}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
    </Row>
  );
}

export function Footer({ children }: { children: ReactNode }) {
  return <Row style={{ justifyContent: 'center', flexWrap: 'wrap', gap: space.xs, marginTop: 'auto', paddingTop: space.lg }}>{children}</Row>;
}
