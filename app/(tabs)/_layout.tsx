import { markBoot } from '@/lib/boot';
import { Pressable, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import type { BottomTabBarButtonProps } from 'expo-router/build/layouts/Tabs';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/ui';
import { space, useColors, useIsDark } from '@/theme/tokens';

// Each tab draws its own icon, centred in the full height of the pill (the built-in item left the icon sitting high).
const tab = (name: IconName, active: IconName, tint: { on: string; off: string }) =>
  function TabButton({ onPress, onLongPress, accessibilityState, accessibilityLabel, testID }: BottomTabBarButtonProps) {
    const focused = !!accessibilityState?.selected;
    return (
      <Pressable accessibilityRole="button" accessibilityState={accessibilityState} accessibilityLabel={accessibilityLabel} testID={testID} onPress={onPress} onLongPress={onLongPress}
        style={{ flex: 1, height: 64, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={focused ? active : name} color={focused ? tint.on : tint.off} size={24} />
      </Pressable>
    );
  };

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
        // A floating pill: deep green, the active tab is sky.
        tabBarActiveTintColor: colors.sky,
        tabBarInactiveTintColor: '#A9C2B3',
        tabBarShowLabel: false,
        tabBarStyle: { position: 'absolute', start: space.lg, end: space.lg, bottom: Math.max(insets.bottom, space.sm) + space.xs, height: 64, borderRadius: 32, borderCurve: 'continuous',
          backgroundColor: colors.hero, borderTopWidth: 0, borderWidth: 1, borderColor: dark ? colors.cardEdge : 'transparent', paddingTop: 0, paddingBottom: 0, boxShadow: '0 10px 24px rgba(0,0,0,0.28)' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarButton: tab('home-outline', 'home', tint) }} />
      <Tabs.Screen name="budget" options={{ title: t('tabs.budget'), tabBarButton: tab('wallet-outline', 'wallet', tint) }} />
      <Tabs.Screen
        name="raseedhu"
        options={{
          title: t('tabs.raseedhu'),
          tabBarButton: () => (
            <View style={{ flex: 1, height: 64, alignItems: 'center', justifyContent: 'center' }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('a11y.scanReceipt')}
                onPress={() => router.push('/scan')}
                style={({ pressed }) => ({ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.sky, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1,
                  borderWidth: 0 })}
              >
                <Icon name="scan" size={26} color={colors.onTile} />
              </Pressable>
            </View>
          ),
        }}
      />
      <Tabs.Screen name="reports" options={{ title: t('tabs.reports'), tabBarButton: tab('pie-chart-outline', 'pie-chart', tint) }} />
      <Tabs.Screen name="more" options={{ title: t('tabs.more'), tabBarButton: tab('ellipsis-horizontal-circle-outline', 'ellipsis-horizontal-circle', tint) }} />
    </Tabs>
  );
}
