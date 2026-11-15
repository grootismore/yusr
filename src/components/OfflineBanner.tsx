import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOnline } from '@/lib/online';
import { radius, space, useColors } from '@/theme/tokens';
import { Icon } from './ui';
import { Text } from './Text';

/** A calm strip while the last request could not reach the server. The app keeps showing what it last saved. */
export function OfflineBanner() {
  const colors = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const online = useOnline();
  if (online) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', bottom: insets.bottom + 92, start: space.lg, end: space.lg, alignItems: 'center' }}>
      <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm, paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: colors.amberWash, borderWidth: 1, borderColor: colors.cardEdge }}>
        <Icon name="cloud-offline-outline" size={18} color={colors.amberDeep} />
        <Text variant="small" color={colors.ink} style={{ flexShrink: 1 }}>{t('offline.banner')}</Text>
      </View>
    </View>
  );
}
