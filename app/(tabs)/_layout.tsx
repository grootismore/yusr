import { Tabs } from 'expo-router';

// PRD §6: five tabs. Titles and icons are wired to i18n in step 3.
export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="transactions" />
      <Tabs.Screen name="debts" />
      <Tabs.Screen name="giving" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}
