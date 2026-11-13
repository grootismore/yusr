import { View , Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Money } from '@/components/Money';
import { Text } from '@/components/Text';
import { Button, Card, Icon, Row, Screen, StackHeader } from '@/components/ui';
import { useContacts, useDebts, useRegisterItems } from '@/data/hooks';
import { readiness } from '@/features/register/readiness';
import { space, useColors } from '@/theme/tokens';

function Step({ done, label }: { done: boolean; label: string }) {
  const colors = useColors();
  return (
    <Row accessible accessibilityLabel={`${label}, ${done ? '✓' : '○'}`}>
      <Icon name={done ? 'checkmark-circle' : 'ellipse-outline'} color={done ? colors.accent : colors.inkMuted} />
      <Text style={{ flex: 1 }}>{label}</Text>
    </Row>
  );
}

export default function Register() {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const items = useRegisterItems().data ?? [];
  const contacts = useContacts().data ?? [];
  const debts = useDebts().data ?? [];
  const r = readiness(items, contacts, debts.filter((d) => d.in_register && d.balance_laari > 0).length);
  const chevron = i18n.language === 'dv' ? 'chevron-back' : 'chevron-forward';

  return (
    <Screen>
      <StackHeader title={t('register.title')} />
      <Card tone="good"><Text>{t('register.intro')}</Text></Card>

      <Card>
        <Text variant="heading">{t('register.checklist')}</Text>
        <Step done={r.hasItems} label={t('register.stepItems')} />
        <Step done={r.hasContact} label={t('register.stepContact')} />
        <Step done={r.contactAccepted} label={t('register.stepAccepted')} />
        {r.ready ? <Text color={colors.accent}>{t('register.ready')}</Text> : null}
      </Card>

      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="heading" style={{ flex: 1 }}>{t('register.items')}</Text>
        <Button kind="secondary" icon="add" label={t('register.addItem')} onPress={() => router.push('/register-item')} />
      </Row>
      <Card>
        {items.length === 0 ? <Text color={colors.inkMuted}>{t('register.itemsEmpty')}</Text> : items.map((i) => (
          <Pressable key={i.id} accessibilityRole="button" accessibilityLabel={i.title} onPress={() => router.push({ pathname: '/register-item', params: { id: i.id } })} style={{ minHeight: 56, justifyContent: 'center' }}>
            <Row>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1}>{i.title}</Text>
                <Text variant="small" color={colors.inkMuted}>{t(`register.kind.${i.kind}`)}{i.counterparty ? ` · ${i.counterparty}` : ''}</Text>
              </View>
              {i.amount_laari ? <Money laari={i.amount_laari} /> : null}
              <Icon name={chevron} color={colors.inkMuted} />
            </Row>
          </Pressable>
        ))}
      </Card>

      <Card>
        {([['/contacts', 'people-outline', t('register.contacts')], ['/release', 'shield-checkmark-outline', t('register.release')]] as const).map(([path, icon, label]) => (
          <Pressable key={path} accessibilityRole="button" accessibilityLabel={label} onPress={() => router.push(path)} style={{ minHeight: 52, justifyContent: 'center' }}>
            <Row><Icon name={icon} color={colors.accent} /><Text style={{ flex: 1 }}>{label}</Text><Icon name={chevron} color={colors.inkMuted} /></Row>
          </Pressable>
        ))}
      </Card>
      <Text variant="small" color={colors.inkMuted}>{t('register.honest')}</Text>
      <View style={{ height: space.md }} />
    </Screen>
  );
}
