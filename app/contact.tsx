import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/Text';
import { Button, Card, Screen, StackHeader } from '@/components/ui';
import * as api from '@/data/api';
import { useContactCases, useWrite } from '@/data/hooks';
import { useColors } from '@/theme/tokens';

/** For someone who has said yes to being trusted. They sign in with the email they were invited on. */
export default function ContactHome() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const cases = useContactCases().data ?? [];
  const answer = useWrite((a: { owner: string; answer: 'fine' | 'passed' }) => api.answerRelease(a.owner, a.answer));
  const withdraw = useWrite(api.withdrawAnswer);

  return (
    <Screen>
      <StackHeader title={t('contactSide.title')} />
      <Text color={colors.inkMuted}>{t('contactSide.intro')}</Text>
      {cases.length === 0 ? <Card><Text color={colors.inkMuted}>{t('contactSide.none')}</Text></Card> : cases.map((c) => {
        const who = c.inviter_name ?? t('contactSide.whoFallback');
        return (
          <Card key={c.owner_id} tone={c.state === 'released' ? 'plain' : 'warn'}>
            {c.state === 'contacts_asked' ? (
              <>
                <Text>{t('contactSide.asked', { who })}</Text>
                {c.my_answer ? (
                  <View style={{ gap: 8 }}>
                    <Text variant="label">{t('contactSide.yourAnswer', { answer: t(`contactSide.answers.${c.my_answer}`) })}</Text>
                    <Button kind="secondary" label={t('contactSide.withdraw')} onPress={() => withdraw.mutate(c.owner_id)} />
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    <Button label={t('contactSide.fine')} onPress={() => answer.mutate({ owner: c.owner_id, answer: 'fine' })} loading={answer.isPending} />
                    <Button kind="secondary" label={t('contactSide.passed')}
                      onPress={() => Alert.alert(t('contactSide.passedTitle'), t('contactSide.passedBody'), [{ text: t('common.cancel'), style: 'cancel' }, { text: t('contactSide.passed'), style: 'destructive', onPress: () => answer.mutate({ owner: c.owner_id, answer: 'passed' }) }])} />
                  </View>
                )}
              </>
            ) : (
              <>
                <Text>{t('contactSide.released', { who })}</Text>
                <Button label={t('contactSide.view')} onPress={() => router.push({ pathname: '/contact-register', params: { owner: c.owner_id, who } })} />
              </>
            )}
          </Card>
        );
      })}
    </Screen>
  );
}
