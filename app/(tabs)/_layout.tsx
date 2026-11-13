import { Pressable, View, type ColorValue } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/ui';
import { space, useColors, useIsDark } from '@/theme/tokens';

const tab = (name: IconName, active: IconName) =>
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Icon name={focused ? active : name} color={color as string} size={24} />;
  };

export default function TabsLayout() {
  const colors = useColors();
  const dark = useIsDark();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // A floating pill: deep green, the active tab is sun.
        tabBarActiveTintColor: colors.sun,
        tabBarInactiveTintColor: '#A9C2B3',
        tabBarShowLabel: false,
        tabBarStyle: { position: 'absolute', start: space.lg, end: space.lg, bottom: Math.max(insets.bottom, space.sm) + space.xs, height: 64, borderRadius: 32, borderCurve: 'continuous',
          backgroundColor: colors.hero, borderTopWidth: 0, borderWidth: 1, borderColor: dark ? colors.cardEdge : 'transparent', paddingTop: 0, paddingBottom: 0, boxShadow: '0 10px 24px rgba(0,0,0,0.28)' },
        tabBarItemStyle: { justifyContent: 'center' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarIcon: tab('home-outline', 'home') }} />
      <Tabs.Screen name="budget" options={{ title: t('tabs.budget'), tabBarIcon: tab('wallet-outline', 'wallet') }} />
      <Tabs.Screen
        name="raseedhu"
        options={{
          title: t('tabs.raseedhu'),
          tabBarButton: () => (
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('a11y.scanReceipt')}
                onPress={() => router.push('/scan')}
                style={({ pressed }) => ({ marginTop: -26, width: 64, height: 64, borderRadius: 32, backgroundColor: colors.sun, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1,
                  borderWidth: 4, borderColor: colors.hero })}
              >
                <Icon name="scan" size={28} color={colors.onTile} />
              </Pressable>
            </View>
          ),
        }}
      />
      <Tabs.Screen name="reports" options={{ title: t('tabs.reports'), tabBarIcon: tab('pie-chart-outline', 'pie-chart') }} />
      <Tabs.Screen name="more" options={{ title: t('tabs.more'), tabBarIcon: tab('ellipsis-horizontal-circle-outline', 'ellipsis-horizontal-circle') }} />
    </Tabs>
  );
}
