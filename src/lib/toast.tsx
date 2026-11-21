import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';
import { Icon } from '@/components/ui';
import { LIFT, radius, space, useColors } from '@/theme/tokens';

export type ToastAction = { label: string; onPress: () => void };
type Toast = { id: number; text: string; kind: 'ok' | 'error'; action?: ToastAction };
let listener: ((t: Toast) => void) | null = null;
let n = 0;

/** A short message at the top of the screen that goes away by itself. Call from anywhere; <ToastHost/> shows it. */
export const toast = (text: string, kind: Toast['kind'] = 'ok', action?: ToastAction): void => { listener?.({ id: ++n, text, kind, action }); };

export function ToastHost() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<Toast | null>(null);
  const [shown] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    listener = (t) => {
      clearTimeout(timer);
      setCurrent(t);
      AccessibilityInfo.announceForAccessibility(t.text);
      Animated.timing(shown, { toValue: 1, duration: 180, useNativeDriver: Platform.OS !== 'web' }).start();
      timer = setTimeout(() => Animated.timing(shown, { toValue: 0, duration: 220, useNativeDriver: Platform.OS !== 'web' }).start(() => setCurrent((c) => (c?.id === t.id ? null : c))), t.action ? 6000 : 2600);
    };
    return () => { listener = null; clearTimeout(timer); };
  }, [shown]);

  if (!current) return null;
  const bad = current.kind === 'error';
  return (
    <View pointerEvents={current.action ? 'box-none' : 'none'} style={{ position: 'absolute', top: insets.top + space.sm, start: space.lg, end: space.lg, alignItems: 'center' }}>
      <Animated.View accessibilityLiveRegion="polite" style={{ opacity: shown, transform: [{ translateY: shown.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
        flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm + 2, paddingHorizontal: space.lg, maxWidth: 420, borderRadius: radius.lg, borderCurve: 'continuous',
        backgroundColor: colors.hero, borderWidth: 1, borderColor: colors.cardEdge, boxShadow: LIFT }}>
        <Icon name={bad ? 'alert-circle' : 'checkmark-circle'} size={20} color={bad ? colors.coral : colors.sky} />
        <Text variant="body" color="#FFFFFF" style={{ flexShrink: 1 }}>{current.text}</Text>
        {current.action ? (
          <Pressable accessibilityRole="button" accessibilityLabel={current.action.label} hitSlop={12} onPress={() => { const a = current.action; setCurrent(null); a?.onPress(); }}>
            <Text variant="label" color={colors.sky}>{current.action.label}</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}
