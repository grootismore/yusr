import { useMemo, useState } from 'react';
import { Alert, Pressable, Share, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Money } from '@/components/Money';
import { Text } from '@/components/Text';
import { Button, Card, Field, Icon, IconButton, Row, Screen, StackHeader, Tile, type IconName } from '@/components/ui';
import * as api from '@/data/api';
import { useCategories, useCategoryName, useHousehold, useHouseholdEntries, useWrite } from '@/data/hooks';
import { nameOf, summarize } from '@/features/household/logic';
import { useAuth } from '@/lib/auth';
import { addMonths, formatDate, monthStart } from '@/lib/dates';
import { success } from '@/lib/haptics';
import { toast } from '@/lib/toast';
import { radius, space, useColors } from '@/theme/tokens';

/** A shared account: one pot of expenses and income that everyone in the household sees. Private entries never appear here. */
export default function HouseholdScreen() {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const catName = useCategoryName();
  const { userId } = useAuth();
  const hq = useHousehold();
  const [month, setMonth] = useState(monthStart());
  const entriesQ = useHouseholdEntries(month);
  const categoriesQ = useCategories();
  const byCat = useMemo(() => new Map((categoriesQ.data ?? []).map((c) => [c.id, c])), [categoriesQ.data]);
  const entries = useMemo(() => entriesQ.data ?? [], [entriesQ.data]);
  const data = hq.data;
  const me = data?.members.find((m) => m.user_id === userId);
  const summary = useMemo(() => summarize(entries, data?.members ?? []), [entries, data]);
  const [name, setName] = useState('');
  const [mine, setMine] = useState('');
  const [code, setCode] = useState('');
  const [invite, setInvite] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const create = useWrite(api.createHousehold);
  const join = useWrite(api.joinHousehold);
  const leave = useWrite(api.leaveHousehold);
  const remove = useWrite(api.removeHouseholdMember);
  const makeInvite = useWrite(api.createHouseholdInvite);

  if (hq.isLoading) return <Screen><StackHeader title={t('household.title')} /></Screen>;

  if (!data) {
    return (
      <Screen>
        <StackHeader title={t('household.title')} />
        <Card tone="good"><Text>{t('household.intro')}</Text></Card>
        <Card>
          <Text variant="heading">{t('household.startTitle')}</Text>
          <Field label={t('household.yourName')} value={mine} onChangeText={setMine} maxLength={40} autoCapitalize="words" />
          <Field label={t('household.householdName')} hint={t('household.householdNameHint')} value={name} onChangeText={setName} maxLength={60} autoCapitalize="words" />
          <Button label={t('household.create')} icon="people-outline" loading={create.isPending} onPress={async () => {
            if (!mine.trim() || !name.trim()) { setError(t('household.needNames')); return; }
            setError(null);
            try { await create.mutateAsync({ name: name.trim(), displayName: mine.trim() }); success(); } catch { setError(t('household.failed')); }
          }} />
        </Card>
        <Card>
          <Text variant="heading">{t('household.joinTitle')}</Text>
          <Text variant="small" color={colors.inkMuted}>{t('household.joinNote')}</Text>
          <Field label={t('household.yourName')} value={mine} onChangeText={setMine} maxLength={40} autoCapitalize="words" />
          <Field label={t('household.code')} value={code} onChangeText={(v) => setCode(v.toUpperCase())} autoCapitalize="characters" autoCorrect={false} maxLength={12} />
          <Button kind="secondary" label={t('household.join')} loading={join.isPending} onPress={async () => {
            if (!mine.trim() || code.trim().length < 8) { setError(t('household.needCode')); return; }
            setError(null);
            try { await join.mutateAsync({ code: code.trim(), displayName: mine.trim() }); success(); } catch { setError(t('household.badCode')); }
          }} />
        </Card>
        {error ? <Text color={colors.coral} accessibilityLiveRegion="polite">{error}</Text> : null}
      </Screen>
    );
  }

  return (
    <Screen>
      <StackHeader title={data.household.name} />
      <Row style={{ justifyContent: 'space-between' }}>
        <IconButton icon={i18n.language === 'dv' ? 'chevron-forward' : 'chevron-back'} label={t('reports.prev')} onPress={() => setMonth(addMonths(month, -1))} />
        <Text variant="label">{month.slice(0, 7)}</Text>
        <IconButton icon={i18n.language === 'dv' ? 'chevron-back' : 'chevron-forward'} label={t('reports.next')} onPress={() => setMonth(addMonths(month, 1))} disabled={month >= monthStart()} />
      </Row>
      <Row style={{ alignItems: 'stretch', gap: space.md }}>
        <Tile color={colors.tile} label={t('household.spent')} laari={summary.spent} />
        <Tile color={colors.sky} label={t('household.income')} laari={summary.income} />
      </Row>

      <Button label={t('household.addShared')} icon="add" onPress={() => router.push({ pathname: '/add-expense', params: { shared: '1' } })} />

      {summary.members.length > 0 ? (
        <Card>
          <Text variant="heading">{t('household.whoPaid')}</Text>
          {summary.members.map((m) => (
            <Row key={m.user_id}><Text style={{ flex: 1 }}>{m.name || t('household.former')}</Text><Money laari={m.paid} /></Row>
          ))}
        </Card>
      ) : null}

      <Text variant="heading">{t('household.entries')}</Text>
      <Card>
        {entries.length === 0 ? <Text color={colors.inkMuted}>{t('household.empty')}</Text> : entries.map((e) => {
          const cat = e.category_id ? byCat.get(e.category_id) : undefined;
          const title = e.merchant || (cat ? catName(cat) : e.note) || t(`household.kind.${e.kind}`);
          return (
            <Pressable key={e.id} accessibilityRole="button" accessibilityHint={t('edit.tapToEdit')} onPress={() => router.push({ pathname: '/household-entry', params: { id: e.id, month: month.slice(0, 7) } })}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, opacity: pressed ? 0.6 : 1 })}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentWash, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={(e.kind === 'income' ? 'arrow-down' : cat?.icon ?? 'ellipsis') as IconName} color={colors.accent} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text numberOfLines={1}>{title}</Text>
                <Text variant="small" color={colors.inkMuted} numberOfLines={1}>{nameOf(data.members, e.user_id) || t('household.former')} · <Text latin variant="small" color={colors.inkMuted}>{formatDate(e.entry_date)}</Text></Text>
              </View>
              <Money laari={e.mvr_laari} prefix={e.kind === 'expense' ? '−' : '+'} />
            </Pressable>
          );
        })}
      </Card>

      <Text variant="heading">{t('household.members')}</Text>
      <Card>
        {data.members.map((m) => (
          <Row key={m.user_id} style={{ minHeight: 44 }}>
            <Icon name={m.role === 'owner' ? 'star-outline' : 'person-outline'} color={colors.accent} />
            <Text style={{ flex: 1 }}>{m.display_name}{m.user_id === userId ? ` (${t('household.you')})` : ''}</Text>
            {me?.role === 'owner' && m.user_id !== userId ? (
              <IconButton icon="close" label={t('household.remove')} color={colors.coral}
                onPress={() => Alert.alert(t('household.removeTitle', { name: m.display_name }), t('household.removeBody'), [{ text: t('common.cancel'), style: 'cancel' }, { text: t('household.remove'), style: 'destructive', onPress: () => remove.mutate(m.user_id, { onSuccess: () => toast(t('household.removed')) }) }])} />
            ) : null}
          </Row>
        ))}
        {invite ? (
          <View style={{ gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: colors.accentWash }}>
            <Text variant="small" color={colors.inkMuted}>{t('household.inviteCode')}</Text>
            <Text latin selectable variant="title" style={{ letterSpacing: 2 }}>{invite}</Text>
            <Text variant="small" color={colors.inkMuted}>{t('household.inviteNote')}</Text>
            <Button kind="secondary" icon="share-outline" label={t('household.share')} onPress={() => void Share.share({ message: t('household.shareText', { name: data.household.name, code: invite }) })} />
          </View>
        ) : null}
        <Button kind="secondary" icon="person-add-outline" label={t('household.invite')} loading={makeInvite.isPending}
          onPress={async () => { try { setInvite(await makeInvite.mutateAsync(undefined) as unknown as string); } catch { toast(t('household.inviteFailed'), 'error'); } }} />
      </Card>

      <Button kind="ghost" label={t('household.leave')} icon="exit-outline"
        onPress={() => Alert.alert(t('household.leaveTitle'), t('household.leaveBody'), [{ text: t('common.cancel'), style: 'cancel' }, { text: t('household.leave'), style: 'destructive', onPress: async () => { await leave.mutateAsync(undefined); toast(t('household.left')); } }])} />
    </Screen>
  );
}
