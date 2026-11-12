import { TabStack } from '@/components/TabStack';

export default function Layout() {
  return <TabStack titleKey="tabs.home" addHref="/transaction" addLabelKey="transactions.add" />;
}
