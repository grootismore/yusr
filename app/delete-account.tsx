import { useTranslation } from 'react-i18next';
import { Screen, StackHeader } from '@/components/ui';
import { DeleteAccountCard } from '@/features/account/DeleteAccountCard';

export default function DeleteAccount() {
  const { t } = useTranslation();
  return (
    <Screen>
      <StackHeader title={t('deleteAccount.title')} />
      <DeleteAccountCard />
    </Screen>
  );
}
