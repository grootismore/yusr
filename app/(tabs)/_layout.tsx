import { Pressable, View, type ColorValue } from 'react-native';
import { BlurView } from 'expo-blur';
import { Tabs, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/ui';
import { fontFor } from '@/theme/fonts';
import { TOUCH, useColors, useIsDark } from '@/theme/tokens';

const tab = (name: IconName, active: IconName) =>
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Icon name={focused ? active : name} color={color as string} size={24} />;
  };

export default function TabsLayout() {
  const colors = useColors();
  const dark = useIsDark();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarLabelStyle: { fontFamily: fontFor(i18n.language, false), fontSize: 13, lineHeight: 22 },
        tabBarStyle: { backgroundColor: 'transparent', borderTopColor: colors.glassEdge, height: 64 + insets.bottom, paddingTop: 6 },
        tabBarBackground: () => (
          <View style={{ flex: 1, backgroundColor: colors.ground }}>
            <BlurView intensity={dark ? 50 : 70} tint={dark ? 'dark' : 'light'} style={{ flex: 1 }} />
            <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.glass }} />
          </View>
        ),
        tabBarItemStyle: { minHeight: TOUCH },
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
                style={({ pressed }) => ({ marginTop: -22, width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1,
                  borderWidth: 4, borderColor: colors.ground })}
              >
                <Icon name="scan" size={28} color={colors.onAccent} />
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
