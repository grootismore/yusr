import { markBoot } from '@/lib/boot';
import { Pressable, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import type { BottomTabBarButtonProps } from 'expo-router/build/layouts/Tabs';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';
import { Icon, type IconName } from '@/components/ui';
import { space, useColors, useIsDark } from '@/theme/tokens';

// Each tab draws its own icon, centred in the full height of the pill (the built-in item left the icon sitting high).
// Icon with its name underneath: an icon alone does not say what the section is.
const tab = (name: IconName, active: IconName, tint: { on: string; off: string }, label: string) =>
  function TabButton({ onPress, onLongPress, accessibilityState, accessibilityLabel, testID }: BottomTabBarButtonProps) {
    const focused = !!accessibilityState?.selected;
    const color = focused ? tint.on : tint.off;
    return (
      <Pressable accessibilityRole="button" accessibilityState={accessibilityState} accessibilityLabel={accessibilityLabel} testID={testID} onPress={onPress} onLongPress={onLongPress}
        style={({ pressed }) => ({ flex: 1, height: TAB_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: 2, transform: [{ scale: pressed ? 0.94 : 1 }] })}>
        <Icon name={focused ? active : name} color={color} size={22} />
        <Text variant="small" color={color} numberOfLines={1} style={{ fontSize: 11, lineHeight: 15, fontWeight: focused ? '700' : '500' }}>{label}</Text>
      </Pressable>
    );
  };

const TAB_HEIGHT = 72;

export default function TabsLayout() {
  markBoot('tabs');
  const colors = useColors();
  const dark = useIsDark();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tint = { on: colors.sky, off: '#A9C2B3' };
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        freezeOnBlur: true, // tabs you are not looking at stop re-rendering
        // A floating pill: deep green, the active tab is sky.
        tabBarActiveTintColor: colors.sky,
        tabBarInactiveTintColor: '#A9C2B3',
        tabBarShowLabel: false,
        tabBarStyle: { position: 'absolute', start: space.lg, end: space.lg, bottom: Math.max(insets.bottom, space.sm) + space.xs, height: TAB_HEIGHT, borderRadius: 36, borderCurve: 'continuous',
          backgroundColor: colors.hero, borderTopWidth: 0, borderWidth: 1, borderColor: dark ? colors.cardEdge : 'transparent', paddingTop: 0, paddingBottom: 0, boxShadow: '0 10px 24px rgba(0,0,0,0.28)' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarButton: tab('home-outline', 'home', tint, t('tabs.home')) }} />
      <Tabs.Screen name="budget" options={{ title: t('tabs.budget'), tabBarButton: tab('wallet-outline', 'wallet', tint, t('tabs.budget')) }} />
      <Tabs.Screen
        name="raseedhu"
        options={{
          title: t('tabs.raseedhu'),
          tabBarButton: () => (
            <View style={{ flex: 1, height: TAB_HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('a11y.scanReceipt')}
                onPress={() => router.push('/scan')}
                style={({ pressed }) => ({ alignItems: 'center', gap: 2, transform: [{ scale: pressed ? 0.94 : 1 }] })}
              >
                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.sky, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="scan" size={24} color={colors.onTile} />
                </View>
                <Text variant="small" color={colors.sky} numberOfLines={1} style={{ fontSize: 11, lineHeight: 15, fontWeight: '700' }}>{t('tabs.scan')}</Text>
              </Pressable>
            </View>
          ),
        }}
      />
      <Tabs.Screen name="reports" options={{ title: t('tabs.reports'), tabBarButton: tab('pie-chart-outline', 'pie-chart', tint, t('tabs.reports')) }} />
      <Tabs.Screen name="more" options={{ title: t('tabs.more'), tabBarButton: tab('ellipsis-horizontal-circle-outline', 'ellipsis-horizontal-circle', tint, t('tabs.more')) }} />
    </Tabs>
  );
}
