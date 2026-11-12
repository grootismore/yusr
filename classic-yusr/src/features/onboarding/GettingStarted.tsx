import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '@/components/AppIcon';
import { Group, Row } from '@/components/ui';
import { useColors } from '@/lib/theme';
import { hideGettingStarted, openSteps, useGettingStartedHidden, type StepKey } from './gettingStarted';

const GO: Record<StepKey, { pathname: '/transaction' | '/debts/debt' | '/giving/commitment' }> = {
  transaction: { pathname: '/transaction' },
  debt: { pathname: '/debts/debt' },
  plan: { pathname: '/giving/commitment' },
};

/**
 * A short, gentle checklist on Home for someone who has an account but has not yet used the rest
 * of the app. Each open step opens the right form. It goes away on its own when every step is done,
 * or when the person hides it. Nothing here is required.
 */
export function GettingStarted({ done }: { done: Record<StepKey, boolean> }) {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useColors();
  const hidden = useGettingStartedHidden();
  if (hidden || openSteps(done).length === 0) return null;
  return (
    <Group title={t('gettingStarted.title')}>
      {(['transaction', 'debt', 'plan'] as const).map((step) => (
        <Row
          key={step}
          label={t(`gettingStarted.${step}`)}
          chevron={!done[step]}
          onPress={done[step] ? undefined : () => router.push(GO[step])}
          right={<AppIcon accessible={false} name={done[step] ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={done[step] ? colors.tint : colors.secondaryText} />}
        />
      ))}
      <Row label={t('gettingStarted.hide')} onPress={hideGettingStarted} />
    </Group>
  );
}
