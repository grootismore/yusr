import { useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, ErrorText, Field, Group, HeaderTextButton, Row, Screen, Segmented } from '@/components/ui';
import { useCategories, useSaveCategory, useSoftDelete } from '@/features/transactions/hooks';
import { KINDS, type Kind } from '@/features/transactions/types';
import { confirmAction } from '@/lib/confirm';
import { useSubmitOnce } from '@/lib/useSubmitOnce';

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const claim = useSubmitOnce();
  const { all } = useCategories();
  const existing = id ? all.find((c) => c.id === id && !c.is_default) : undefined;
  const save = useSaveCategory();
  const archive = useSoftDelete('categories');

  const [name, setName] = useState(existing ? (i18n.language === 'dv' ? existing.name_dv : existing.name_en) : '');
  const [kind, setKind] = useState<Kind>(existing?.kind ?? 'expense');
  const [submitted, setSubmitted] = useState(false);

  if (id && !existing) return null;

  const nameOk = name.trim().length > 0 && name.trim().length <= 100;

  function onSave() {
    setSubmitted(true);
    if (!nameOk) return;
    if (!claim()) return;
    save({ name: name.trim(), kind }, existing);
    router.back();
  }

  function onArchive() {
    if (!existing) return;
    confirmAction({
      title: t('categories.archiveTitle'),
      message: t('categories.archiveBody'),
      confirmLabel: t('categories.archive'),
      cancelLabel: t('common.cancel'),
      onConfirm: () => {
          archive(existing.id);
          router.back();
        },
    });
  }

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: existing ? t('categories.edit') : t('categories.new'),
          headerRight: () => <HeaderTextButton label={t('common.save')} onPress={onSave} />,
        }}
      />
      {submitted && !nameOk ? <ErrorText>{t('categories.nameRequired')}</ErrorText> : null}
      <Group>
        <Field label={t('categories.name')} value={name} onChangeText={setName} maxLength={100} returnKeyType="done" />
      </Group>
      {existing ? (
        // A category's kind is fixed once created: transactions must always match their category's kind.
        <Group>
          <Row label={t('categories.kind')} value={t(`kind.${existing.kind}`)} />
        </Group>
      ) : (
        <Group title={t('categories.kind')}>
          <Segmented options={KINDS.map((value) => ({ value, label: t(`kind.${value}`) }))} value={kind} onChange={setKind} />
        </Group>
      )}
      {existing ? <Button variant="destructive" title={t('categories.archive')} onPress={onArchive} /> : null}
    </Screen>
  );
}
