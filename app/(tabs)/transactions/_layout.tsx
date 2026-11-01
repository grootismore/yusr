import { TabStack } from '@/components/TabStack';

export default function Layout() {
  return <TabStack titleKey="tabs.transactions" addHref="/transaction" addLabelKey="transactions.add" />;
}
