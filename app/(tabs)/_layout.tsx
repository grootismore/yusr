import { NativeTabs } from 'expo-router/native-tabs';
import { useTranslation } from 'react-i18next';
import { useReminderSync } from '@/features/reminders/useReminderSync';
import { usesNunito } from '@/lib/fonts';
import { i18n } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

// PRD §6: five tabs. The system's own tab bar (UITabBarController on iOS, which is the Liquid Glass
// bar on current iOS; Material navigation on Android). Each tab is its own native stack, so large
// titles live there. Labels are single words and every tab stays visible (HIG: tab bars).
const TABS = [
  { name: '(home)', title: 'tabs.home', sf: { default: 'house', selected: 'house.fill' }, md: 'home' },
  { name: 'transactions', title: 'tabs.transactions', sf: 'arrow.left.arrow.right', md: 'swap_horiz' },
  { name: 'debts', title: 'tabs.debts', sf: { default: 'doc.text', selected: 'doc.text.fill' }, md: 'receipt_long' },
  { name: 'giving', title: 'tabs.giving', sf: { default: 'heart', selected: 'heart.fill' }, md: 'favorite' },
  { name: 'more', title: 'tabs.more', sf: 'ellipsis', md: 'more_horiz' },
] as const;

export default function TabsLayout() {
  const { t } = useTranslation();
  const colors = useColors();
  useReminderSync(); // keeps scheduled reminders matching the data (only when the user turned them on)
  return (
    <NativeTabs tintColor={colors.tint} labelStyle={usesNunito(i18n.language) ? { fontFamily: 'NunitoSans_600SemiBold' } : undefined}>
      {TABS.map(({ name, title, sf, md }) => (
        <NativeTabs.Trigger key={name} name={name}>
          <NativeTabs.Trigger.Label>{t(title)}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={sf} md={md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
