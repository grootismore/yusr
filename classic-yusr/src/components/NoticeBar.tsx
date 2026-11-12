import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hideNotice, useNotice } from '@/lib/notice';
import { useColors } from '@/lib/theme';
import { Text } from './Text';

/** The bar behind `showNotice`. Read by screen readers when it appears; the action is a real button. */
export function NoticeBar() {
  const notice = useNotice();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  if (!notice) return null;
  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', start: 16, end: 16, bottom: insets.bottom + 64, alignItems: 'center' }}
    >
      <View
        accessibilityLiveRegion="polite"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.text, borderRadius: 14, paddingStart: 16, paddingEnd: notice.actionLabel ? 4 : 16, minHeight: 48, maxWidth: 520 }}
      >
        <Text style={{ flexShrink: 1, fontSize: 15, color: colors.background, paddingVertical: 12 }}>{notice.message}</Text>
        {notice.actionLabel ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              notice.onAction?.();
              hideNotice();
            }}
            style={{ minHeight: 44, minWidth: 64, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.background, textDecorationLine: 'underline' }}>{notice.actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
