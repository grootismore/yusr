import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/lib/theme';

// PRD §6: five tabs.
const TABS = [
  { name: 'index', title: 'tabs.home', icon: 'home' },
  { name: 'transactions', title: 'tabs.transactions', icon: 'swap-horizontal' },
  { name: 'debts', title: 'tabs.debts', icon: 'receipt' },
  { name: 'giving', title: 'tabs.giving', icon: 'heart' },
  { name: 'more', title: 'tabs.more', icon: 'ellipsis-horizontal' },
] as const;

export default function TabsLayout() {
  const { t } = useTranslation();
  const colors = useColors();
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.tint }}>
      {TABS.map(({ name, title, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: t(title),
            tabBarIcon: ({ focused, size }) => (
              <Ionicons name={icon} size={size} color={focused ? colors.tint : colors.secondaryText} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
