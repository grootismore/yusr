import { Children, Fragment, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  I18nManager,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppIcon, type IconName } from './AppIcon';
import { formatMVR } from '@/lib/money';
import { selectionHaptic } from '@/lib/haptics';
import { useColors } from '@/lib/theme';

export function Screen({ children, refresh }: { children: ReactNode; refresh?: { refreshing: boolean; onRefresh: () => void } }) {
  const colors = useColors();
  return (
    <ScrollView
      refreshControl={refresh ? <RefreshControl refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} /> : undefined}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 20 }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      // The keyboard never hides the field being edited: the content scrolls up to make room, and
      // dragging down dismisses the keyboard (HIG: entering data).
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode="interactive"
    >
      {children}
    </ScrollView>
  );
}

/** iOS-style grouped inset list. */
export function Group({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const colors = useColors();
  const items = Children.toArray(children);
  return (
    <View style={{ gap: 6 }}>
      {title ? (
        <Text accessibilityRole="header" style={{ fontSize: 13, color: colors.secondaryText, paddingHorizontal: 16 }}>
          {title}
        </Text>
      ) : null}
      <View style={{ backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden' }}>
        {items.map((child, index) => (
          <Fragment key={index}>
            {index > 0 ? (
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginStart: 16 }} />
            ) : null}
            {child}
          </Fragment>
        ))}
      </View>
      {footer ? (
        <Text style={{ fontSize: 13, color: colors.secondaryText, paddingHorizontal: 16 }}>{footer}</Text>
      ) : null}
    </View>
  );
}

interface RowProps {
  label: string;
  value?: string;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  accessibilityHint?: string;
}

export function Row({ label, value, right, onPress, chevron, destructive, accessibilityHint }: RowProps) {
  const colors = useColors();
  const content = (
    <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 }}>
      <Text style={{ flex: 1, fontSize: 17, color: destructive ? colors.danger : colors.text }}>{label}</Text>
      {value ? <Text style={{ fontSize: 17, color: colors.secondaryText, flexShrink: 1 }}>{value}</Text> : null}
      {right}
      {chevron ? (
        <AppIcon
          accessible={false}
          name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'}
          size={18}
          color={colors.secondaryText}
        />
      ) : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {content}
    </Pressable>
  );
}

/** Money always renders left-to-right with aligned digits, even in an RTL layout. */
export function Money({ laari, color, bold, hidden }: { laari: number; color?: string; bold?: boolean; hidden?: boolean }) {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <Text
      // Private mode: masked on screen and read out as "Hidden", never as the amount.
      accessibilityLabel={hidden ? t('common.hidden') : undefined}
      style={{
        writingDirection: 'ltr',
        fontVariant: ['tabular-nums'],
        fontSize: 17,
        fontWeight: bold ? '600' : '400',
        color: color ?? colors.text,
      }}
    >
      {hidden ? '••••' : formatMVR(laari)}
    </Text>
  );
}

export function Button({
  title,
  onPress,
  disabled,
  busy,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: 'primary' | 'destructive';
}) {
  const colors = useColors();
  const background = variant === 'destructive' ? colors.danger : colors.tint;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        borderRadius: 12,
        backgroundColor: background,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
      })}
    >
      {busy ? (
        <ActivityIndicator color={colors.background} />
      ) : (
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.background }}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const colors = useColors();
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12, padding: 3 }}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) selectionHaptic();
              onChange(option.value);
            }}
            style={{
              flex: 1,
              minHeight: 44,
              paddingVertical: 6,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? colors.tint : 'transparent',
            }}
          >
            <Text
              numberOfLines={2}
              style={{ fontSize: 15, fontWeight: '600', textAlign: 'center', paddingHorizontal: 4, color: selected ? colors.background : colors.text }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 }}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) selectionHaptic();
              onChange(option.value);
            }}
            style={{
              minHeight: 44,
              justifyContent: 'center',
              paddingHorizontal: 16,
              borderRadius: 22,
              backgroundColor: selected ? colors.tint : colors.background,
            }}
          >
            <Text style={{ fontSize: 15, color: selected ? colors.background : colors.text }}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Label on the left, input on the right. `latin` keeps digits and emails left-to-right. */
export function Field({ label, latin, ...input }: { label: string; latin?: boolean } & TextInputProps) {
  const colors = useColors();
  return (
    <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 }}>
      <Text style={{ fontSize: 17, color: colors.text }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.secondaryText}
        {...input}
        style={[
          { flex: 1, minHeight: 44, fontSize: 17, color: colors.text },
          latin ? { textAlign: 'right', writingDirection: 'ltr' } : null,
        ]}
      />
    </View>
  );
}

export function ErrorText({ children }: { children?: string | null }) {
  const colors = useColors();
  if (!children) return null;
  return (
    <Text accessibilityLiveRegion="polite" style={{ fontSize: 15, color: colors.danger, paddingHorizontal: 16 }}>
      {children}
    </Text>
  );
}

export function EmptyState({
  icon = 'wallet-outline',
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const colors = useColors();
  return (
    <View style={{ alignItems: 'center', gap: 12, padding: 32 }}>
      <AppIcon accessible={false} name={icon} size={40} color={colors.secondaryText} />
      <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: '600', color: colors.text, textAlign: 'center' }}>
        {title}
      </Text>
      {body ? <Text style={{ fontSize: 15, color: colors.secondaryText, textAlign: 'center' }}>{body}</Text> : null}
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

/** Icon-only header button: 44pt target and a spoken label. */
export function HeaderIconButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
    >
      <AppIcon name={icon} size={26} color={colors.tint} />
    </Pressable>
  );
}

export function HeaderTextButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8, opacity: disabled ? 0.4 : 1 }}
    >
      <Text style={{ fontSize: 17, color: colors.tint }}>{label}</Text>
    </Pressable>
  );
}
