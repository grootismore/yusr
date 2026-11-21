import { confirmDialog } from '@/lib/dialog';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Card, ListRow, Screen, ScreenTitle } from '@/components/ui';
import { usePlan } from '@/data/hooks';
import { useFeatureStates } from '@/features/features/hooks';
import { FEATURES, GROUPS } from '@/features/features/registry';
import { useAuth } from '@/lib/auth';
import { usePending } from '@/lib/outbox';
import { space } from '@/theme/tokens';

export default function More() {
  const { t } = useTranslation();
  const router = useRouter();
  const { signOut } = useAuth();
  const pending = usePending();
  const plan = usePlan().data;
  const on = useFeatureStates();
  return (
    <Screen tabbed>
      <ScreenTitle title={t('more.title')} />
      <Card style={{ paddingVertical: space.sm, gap: 0 }}>
        <ListRow icon="swap-vertical" title={t('activity.title')} onPress={() => router.push('/activity')} last />
      </Card>

      {GROUPS.map((g) => {
        const rows = FEATURES.filter((f) => f.group === g && on[f.id]);
        if (!rows.length) return null;
        return (
          <View key={g} style={{ gap: space.sm }}>
            <Text variant="heading">{t(`features.groups.${g}`)}</Text>
            <Card style={{ paddingVertical: space.sm, gap: 0 }}>
              {rows.map((f, i) => <ListRow key={f.id} icon={f.icon} title={t(f.title)} onPress={() => router.push(f.route as never)} last={i === rows.length - 1 && !(g === 'safety')} />)}
              {g === 'safety' ? <ListRow icon="call-outline" title={t('more.contactSide')} onPress={() => router.push('/contact')} last /> : null}
            </Card>
          </View>
        );
      })}

      <Card style={{ paddingVertical: space.sm, gap: 0 }}>
        <ListRow icon="sparkles-outline" title={t('plus.title')} subtitle={plan?.plus ? t('plus.active') : t('plus.more')} onPress={() => router.push('/plus')} />
        <ListRow icon="options-outline" title={t('features.add')} subtitle={t('features.addNote')} onPress={() => router.push('/features')} />
        <ListRow icon="settings-outline" title={t('more.settings')} onPress={() => router.push('/settings')} />
        <ListRow icon="information-circle-outline" title={t('about.title')} onPress={() => router.push('/about')} last />
      </Card>
      <Button kind="secondary" label={t('more.signOut')} icon="log-out-outline" onPress={async () => {
        if (pending > 0 && !(await confirmDialog({ title: t('offline.signOutWaiting', { count: pending }), confirmLabel: t('offline.signOutAnyway'), cancelLabel: t('common.cancel'), destructive: true }))) return;
        void signOut();
      }} />
    </Screen>
  );
}
