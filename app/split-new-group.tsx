import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { useTranslation } from 'react-i18next';
import { CURRENCIES } from '@/components/ExpenseForm';
import { Text } from '@/components/Text';
import { Button, Chip, Field, IconButton, Row, Screen } from '@/components/ui';
import * as api from '@/data/api';
import { useWrite } from '@/data/hooks';
import { success } from '@/lib/haptics';
import { toast } from '@/lib/toast';
import { space, useColors } from '@/theme/tokens';

/** A new group: a name, a currency, and the people. The people do not need the app. */
export default function SplitNewGroup() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const add = useWrite(api.addSplitGroup);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('MVR');
  const [me, setMe] = useState(t('split.meDefault'));
  const [people, setPeople] = useState<string[]>([]);
  const [next, setNext] = useState('');
  const [errors, setErrors] = useState<{ name?: string; people?: string }>({});

  const addPerson = () => { const n = next.trim(); if (n && !people.includes(n) && n !== me.trim()) setPeople([...people, n]); setNext(''); };

  async function submit() {
    const e: typeof errors = {};
    if (!name.trim()) e.name = t('split.needName');
    const all = next.trim() ? [...people, next.trim()] : people;
    if (all.length < 1) e.people = t('split.needPeople');
    setErrors(e);
    if (Object.keys(e).length) return;
    await add.mutateAsync({ name: name.trim(), currency, people: [{ id: Crypto.randomUUID(), name: me.trim() || t('split.meDefault'), is_me: true }, ...all.map((n) => ({ id: Crypto.randomUUID(), name: n, is_me: false }))] } as Parameters<typeof api.addSplitGroup>[0]);
    success();
    toast(t('toast.saved'));
    router.back();
  }

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="title">{t('split.newGroup')}</Text>
        <Button kind="ghost" label={t('common.cancel')} onPress={() => router.back()} />
      </Row>
      <Field label={t('split.groupName')} hint={t('split.groupNameHint')} value={name} onChangeText={setName} maxLength={60} error={errors.name} autoCapitalize="words" />
      <View style={{ gap: space.sm }}>
        <Text variant="label">{t('recurring.currency')}</Text>
        <Row>{CURRENCIES.map((c) => <Chip key={c} label={c} selected={currency === c} onPress={() => setCurrency(c)} />)}</Row>
      </View>
      <Field label={t('split.yourName')} value={me} onChangeText={setMe} maxLength={40} autoCapitalize="words" />
      <View style={{ gap: space.sm }}>
        <Text variant="label">{t('split.people')}</Text>
        <Text variant="small" color={colors.inkMuted}>{t('split.peopleHint')}</Text>
        {people.map((p) => (
          <Row key={p} style={{ minHeight: 44 }}>
            <Text style={{ flex: 1 }}>{p}</Text>
            <IconButton icon="close" label={t('common.remove')} color={colors.coral} onPress={() => setPeople(people.filter((x) => x !== p))} />
          </Row>
        ))}
        <Field label={t('split.addPerson')} value={next} onChangeText={setNext} maxLength={40} autoCapitalize="words" error={errors.people} returnKeyType="done" onSubmitEditing={addPerson} />
        <Button kind="secondary" icon="add" label={t('split.addPerson')} onPress={addPerson} />
      </View>
      <Button label={t('common.save')} onPress={submit} loading={add.isPending} />
    </Screen>
  );
}
