import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Money } from '@/components/Money';
import { Text } from '@/components/Text';
import { Card, Row, Screen, StackHeader } from '@/components/ui';
import { registerForContact } from '@/data/api';
import type { ContactRegister } from '@/features/register/types';
import { useColors } from '@/theme/tokens';

/** Read-only view of a released register. The database re-checks everything on every call; nothing is cached or editable here. */
export default function ContactRegisterScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const { owner, who } = useLocalSearchParams<{ owner: string; who?: string }>();
  const [data, setData] = useState<ContactRegister | null | 'denied'>(null);

  useEffect(() => {
    let live = true;
    registerForContact(owner).then((r) => live && setData(r)).catch(() => live && setData('denied'));
    return () => { live = false; };
  }, [owner]);

  return (
    <Screen>
      <StackHeader title={t('contactSide.listTitle')} />
      {who ? <Text color={colors.inkMuted}>{t('contactSide.condolences')} {who}</Text> : null}
      {data === 'denied' ? <Card tone="warn"><Text>{t('contactSide.denied')}</Text></Card> : null}
      {data && data !== 'denied' ? (
        <>
          <Text variant="heading">{t('contactSide.debts')}</Text>
          <Card>
            {data.debts.length === 0 ? <Text color={colors.inkMuted}>{t('contactSide.none2')}</Text> : data.debts.map((d, i) => (
              <Row key={i} style={{ minHeight: 48 }}><Text style={{ flex: 1 }}>{d.lender}</Text><Money laari={d.balance_laari} /></Row>
            ))}
          </Card>
          <Text variant="heading">{t('contactSide.items')}</Text>
          <Card>
            {data.items.length === 0 ? <Text color={colors.inkMuted}>{t('contactSide.none2')}</Text> : data.items.map((i, idx) => (
              <View key={idx} style={{ gap: 4 }}>
                <Row><Text style={{ flex: 1 }}>{i.title}</Text>{i.amount_laari ? <Money laari={i.amount_laari} /> : null}</Row>
                <Text variant="small" color={colors.inkMuted}>{t(`register.kind.${i.kind}`)}{i.counterparty ? ` · ${i.counterparty}` : ''}</Text>
                {i.details ? <Text selectable>{i.details}</Text> : null}
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
