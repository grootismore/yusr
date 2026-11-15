import { useTranslation } from 'react-i18next';
import { useHousehold } from '@/data/hooks';

/** The small label on a shared item: "For Nanns" when it is tied to a person, otherwise "Shared". Empty when private. */
export function useShareTag(): (item: { household_id?: string | null; for_user?: string | null }) => string {
  const { t } = useTranslation();
  const members = useHousehold().data?.members ?? [];
  return (item) => {
    if (!item.household_id) return '';
    const name = item.for_user ? members.find((m) => m.user_id === item.for_user)?.display_name : undefined;
    return name ? t('household.tiedTo', { name }) : t('household.sharedTag');
  };
}
