import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Group, Row, Screen } from '@/components/ui';
import { useCategoryName } from '@/features/transactions/format';
import { useCategories } from '@/features/transactions/hooks';
import { KINDS } from '@/features/transactions/types';

export default function CategoriesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const name = useCategoryName();
  const { active } = useCategories();
  return (
    <Screen>
      {KINDS.map((kind) => {
        const items = active.filter((c) => c.kind === kind);
        if (items.length === 0) return null;
        return (
          <Group key={kind} title={t(`kind.${kind}`)}>
            {items.map((category) =>
              category.is_default ? (
                <Row key={category.id} label={name(category)} value={t('categories.builtIn')} />
              ) : (
                <Row
                  key={category.id}
                  label={name(category)}
                  chevron
                  onPress={() => router.push({ pathname: '/more/category', params: { id: category.id } })}
                />
              ),
            )}
          </Group>
        );
      })}
    </Screen>
  );
}
