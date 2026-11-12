import { useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, Chips, ErrorText, Field, Group, HeaderTextButton, Screen } from '@/components/ui';
import { toInputText } from '@/features/transactions/format';
import { useAccounts, useSaveAccount, useSoftDelete } from '@/features/transactions/hooks';
import { ACCOUNT_TYPES, type AccountType } from '@/features/transactions/types';
import { parseMVR } from '@/lib/money';
import { confirmAction } from '@/lib/confirm';
import { useDiscardGuard } from '@/lib/useDiscardGuard';
import { useSubmitOnce } from '@/lib/useSubmitOnce';

export default function AccountScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const claim = useSubmitOnce();
  const { all } = useAccounts();
  const existing = id ? all.find((a) => a.id === id) : undefined;
  const save = useSaveAccount();
  const archive = useSoftDelete('accounts');

  const [name, setName] = useState(existing?.name ?? '');
  const [type, setType] = useState<AccountType>(existing?.type ?? 'cash');
  const [opening, setOpening] = useState(existing ? toInputText(existing.opening_balance_laari) : '0');
  const [submitted, setSubmitted] = useState(false);

  // Asks before a changed form is closed without saving.
  const leave = useDiscardGuard([name, type, opening]);

  if (id && !existing) return null;

  let openingLaari: number | null = null;
  try {
    openingLaari = opening.trim() === '' ? 0 : parseMVR(opening);
  } catch {
    openingLaari = null;
  }
  const nameOk = name.trim().length > 0 && name.trim().length <= 100;
  // Two accounts with the same name cannot be told apart in the lists, so a name can only be used once.
  const nameTaken = all.some((a) => a.id !== existing?.id && a.deleted_at === null && a.name.trim().toLowerCase() === name.trim().toLowerCase());
  const error = !nameOk
    ? t('accounts.nameRequired')
    : nameTaken
      ? t('accounts.nameTaken')
      : openingLaari === null
        ? t('accounts.openingInvalid')
        : null;

  function onSave() {
    setSubmitted(true);
    if (error || openingLaari === null) return;
    if (!claim()) return;
    save({ name: name.trim(), type, opening_balance_laari: openingLaari }, existing);
    leave(); router.back();
  }

  function onArchive() {
    if (!existing) return;
    confirmAction({
      title: t('accounts.archiveTitle'),
      message: t('accounts.archiveBody'),
      confirmLabel: t('accounts.archive'),
      cancelLabel: t('common.cancel'),
      onConfirm: () => {
          archive(existing.id);
          leave(); router.back();
        },
    });
  }

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: existing ? t('accounts.edit') : t('accounts.new'),
          headerRight: () => <HeaderTextButton label={t('common.save')} onPress={onSave} />,
        }}
      />
      {submitted ? <ErrorText>{error}</ErrorText> : null}
      <Group>
        <Field label={t('accounts.name')} value={name} onChangeText={setName} maxLength={100} returnKeyType="done" />
        <Field
          label={t('accounts.opening')}
          latin
          value={opening}
          onChangeText={setOpening}
          keyboardType="numbers-and-punctuation"
        />
      </Group>
      <Group title={t('accounts.type')}>
        <Chips
          options={ACCOUNT_TYPES.map((value) => ({ value, label: t(`accounts.types.${value}`) }))}
          value={type}
          onChange={setType}
        />
      </Group>
      {existing ? <Button variant="destructive" title={t('accounts.archive')} onPress={onArchive} /> : null}
    </Screen>
  );
}
