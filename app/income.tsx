import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Money } from '@/components/Money';
import { Text } from '@/components/Text';
import { Card, Icon, IconButton, Row, Screen, StackHeader } from '@/components/ui';
import { useHousehold, useHouseholdEntries, useIncome, useRefresh } from '@/data/hooks';
import { incomeBreakdown } from '@/features/income/logic';
import { useAuth } from '@/lib/auth';
import { addMonths, formatDate, monthStart } from '@/lib/dates';
import { useMoneyText } from '@/lib/privacy';
import { space, useColors } from '@/theme/tokens';

/** Where the month's income came from: by person, by source and by currency, then every entry. Opens from the Income tiles. */
export default function Income() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const money = useMoneyText();
  const me = useAuth().userId;
  const refresh = useRefresh();
  const { month: startMonth } = useLocalSearchParams<{ month?: string }>();
  const [month, setMonth] = useState(startMonth && /^\d{4}-\d{2}-01$/.test(startMonth) ? startMonth : monthStart());
  const own = useIncome(month).data;
  const shared = useHouseholdEntries(month).data;
  const members = useHousehold().data?.members;
  const b = useMemo(() => incomeBreakdown(own ?? [], shared ?? [], members ?? [], me, { you: t('income.you'), income: t('add.income'), someone: t('household.former') }), [own, shared, members, me, t]);

  return (
    <Screen onRefresh={refresh}>
      <StackHeader title={t('income.screenTitle')} />
      <Row style={{ justifyContent: 'space-between' }}>
        <IconButton icon={'chevron-back'} label={t('reports.prev')} onPress={() => setMonth(addMonths(month, -1))} />
        <Text variant="heading" accessibilityLiveRegion="polite">{(t('months', { returnObjects: true }) as string[])[Number(month.slice(5, 7)) - 1]} <Text latin variant="heading">{month.slice(0, 4)}</Text></Text>
        <IconButton icon={'chevron-forward'} label={t('reports.next')} disabled={month >= monthStart()} onPress={() => setMonth(addMonths(month, 1))} />
      </Row>

      <Card tone="hero" style={{ gap: space.xs }}>
        <Text color={colors.onHero}>{t('income.total')}</Text>
        <Money laari={b.total} variant="display" numberOfLines={1} adjustsFontSizeToFit color={colors.onHero} style={{ fontSize: 40, lineHeight: 52 }} />
      </Card>

      {b.entries.length === 0 ? <Card style={{ alignItems: 'center', padding: space.xl }}><Text color={colors.inkMuted}>{t('income.none')}</Text></Card> : (
        <>
          {b.byPerson.length ? (
            <View style={{ gap: space.sm }}>
              <Text variant="heading">{t('income.byPerson')}</Text>
              <Card>{b.byPerson.map((p) => <Row key={p.id} style={{ minHeight: 44 }}><Text style={{ flex: 1 }}>{p.name}</Text><Money laari={p.total} /></Row>)}</Card>
            </View>
          ) : null}

          <View style={{ gap: space.sm }}>
            <Text variant="heading">{t('income.bySource')}</Text>
            <Card>
              {b.bySource.map((s) => (
                <View key={s.name} style={{ gap: 2, paddingVertical: space.xs }}>
                  <Row style={{ minHeight: 36 }}><Text style={{ flex: 1 }}>{s.name}</Text><Money laari={s.total} /></Row>
                  {s.currencies.some((c) => c.currency !== 'MVR') ? s.currencies.map((c) => (
                    <Row key={c.currency}>
                      <Text latin variant="small" color={colors.inkMuted} style={{ flex: 1 }}>{money(c.minor, c.currency)}</Text>
                      {c.currency !== 'MVR' ? <Text latin variant="small" color={colors.inkMuted}>{money(c.mvr, 'MVR')}</Text> : null}
                    </Row>
                  )) : null}
                </View>
              ))}
            </Card>
          </View>

          {b.foreign.length ? (
            <View style={{ gap: space.sm }}>
              <Text variant="heading">{t('income.byCurrency')}</Text>
              <Card>
                {b.foreign.map((c) => (
                  <Row key={c.currency} style={{ minHeight: 44 }}>
                    <Text latin style={{ flex: 1 }}>{money(c.minor, c.currency)}</Text>
                    <Text latin color={colors.inkMuted}>{money(c.mvr, 'MVR')}</Text>
                  </Row>
                ))}
              </Card>
            </View>
          ) : null}

          <View style={{ gap: space.sm }}>
            <Text variant="heading">{t('income.entries')}</Text>
            <Card>
              {b.entries.map((e) => (
                <Pressable key={`${e.kind}-${e.id}`} accessibilityRole="button" accessibilityHint={t('edit.tapToEdit')}
                  onPress={() => router.push(e.kind === 'own' ? { pathname: '/edit-income', params: { id: e.id } } : { pathname: '/household-entry', params: { id: e.id, month: month.slice(0, 7) } })}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, opacity: pressed ? 0.6 : 1 })}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentWash, alignItems: 'center', justifyContent: 'center' }}><Icon name="arrow-down" color={colors.accent} /></View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text numberOfLines={1}>{e.title?.trim() || t('add.income')}</Text>
                    <Text variant="small" color={colors.inkMuted} numberOfLines={2}>
                      {e.kind === 'shared' ? `${e.who === me ? t('income.you') : (members?.find((m) => m.user_id === e.who)?.display_name ?? t('household.former'))} · ` : ''}<Text latin variant="small" color={colors.inkMuted}>{formatDate(e.date)}</Text>
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Money laari={e.mvr} prefix="+" color={colors.accent} />
                    {e.currency !== 'MVR' ? <Money laari={e.minor} currency={e.currency} variant="small" color={colors.inkMuted} /> : null}
                  </View>
                </Pressable>
              ))}
            </Card>
          </View>
        </>
      )}
    </Screen>
  );
}
