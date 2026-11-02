import { useState } from 'react';
import { Alert, Switch } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { DateField } from '@/components/DateField';
import { Button, Chips, ErrorText, Field, Group, HeaderTextButton, Row, Screen, Segmented } from '@/components/ui';
import { addDays } from '@/features/giving/hijri';
import { parsePositiveAmount, toInputText, useCategoryName, useFormatDate } from '@/features/transactions/format';
import { useAccounts, useCategories, useRecurringItems, useSaveRecurring, useSoftDelete } from '@/features/transactions/hooks';
import { toISODate } from '@/features/transactions/logic';
import { nextDueAfter } from '@/features/transactions/recurring';
import { confirmAction } from '@/lib/confirm';
import { useSubmitOnce } from '@/lib/useSubmitOnce';

type Kind = 'income' | 'expense';

export default function RecurringItemScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const claim = useSubmitOnce();
  const formatDate = useFormatDate();
  const categoryName = useCategoryName();
  const accounts = useAccounts();
  const categories = useCategories();
  const { all } = useRecurringItems();
  const existing = id ? all.find((r) => r.id === id) : undefined;
  const save = useSaveRecurring();
  const archive = useSoftDelete('recurring_items');

  const [name, setName] = useState(existing?.name ?? '');
  const [kind, setKind] = useState<Kind>(existing?.kind ?? 'expense');
  const [amount, setAmount] = useState(existing ? toInputText(existing.amount_laari) : '');
  const [categoryId, setCategoryId] = useState<string | null>(existing?.category_id ?? null);
  const [accountId, setAccountId] = useState<string | null>(existing?.account_id ?? null);
  const [schedule, setSchedule] = useState<'weekly' | 'monthly'>(existing?.schedule ?? 'monthly');
  const [dayOfMonth, setDayOfMonth] = useState(existing?.day_of_month ? String(existing.day_of_month) : '1');
  const [weekday, setWeekday] = useState(String(existing?.weekday ?? 5));
  const [nextDue, setNextDue] = useState(existing?.next_due_on ?? toISODate(new Date()));
  const [active, setActive] = useState(existing?.active ?? true);
  const [submitted, setSubmitted] = useState(false);

  if (id && !existing) return null;

  const chosenAccountId = accountId ?? accounts.active[0]?.id ?? null;
  const options = categories.active.filter((c) => c.kind === kind);
  const chosenCategoryId = options.some((c) => c.id === categoryId) ? categoryId : null;
  const amountLaari = parsePositiveAmount(amount);
  const day = Number(dayOfMonth);
  const dayOk = schedule === 'weekly' || (Number.isInteger(day) && day >= 1 && day <= 31);

  const error = !name.trim()
    ? t('recurring.nameRequired')
    : amountLaari === null
      ? t('debts.amountInvalid')
      : !chosenCategoryId
        ? t('recurring.pickCategory')
        : !chosenAccountId
          ? t('recurring.pickAccount')
          : !dayOk
            ? t('debts.dayInvalid')
            : null;

  function onSave() {
    setSubmitted(true);
    if (error || amountLaari === null || !chosenCategoryId || !chosenAccountId) return;
    if (!claim()) return;
    const fields = {
      schedule,
      day_of_month: schedule === 'monthly' ? day : null,
      weekday: schedule === 'weekly' ? Number(weekday) : null,
    };
    save(
      {
        name: name.trim(),
        kind,
        amount_laari: amountLaari,
        category_id: chosenCategoryId,
        account_id: chosenAccountId,
        ...fields,
        // A new item starts from the next date its schedule gives; an existing one keeps the date shown.
        next_due_on: existing ? nextDue : nextDueAfter(fields, addDays(toISODate(new Date()), -1)),
        active,
      },
      existing,
    );
    router.back();
  }

  function onArchive() {
    if (!existing) return;
    confirmAction({
      title: t('recurring.archiveTitle'),
      message: t('recurring.archiveBody'),
      confirmLabel: t('recurring.archive'),
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
          title: existing ? t('recurring.edit') : t('recurring.new'),
          headerRight: () => <HeaderTextButton label={t('common.save')} onPress={onSave} />,
        }}
      />
      <Segmented
        options={[
          { value: 'expense' as Kind, label: t('kind.expense') },
          { value: 'income' as Kind, label: t('kind.income') },
        ]}
        value={kind}
        onChange={setKind}
      />
      <Group>
        <Field label={t('recurring.name')} value={name} onChangeText={setName} maxLength={100} />
        <Field label={t('recurring.amount')} latin value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" />
      </Group>
      <Group title={t('recurring.category')}>
        <Chips options={options.map((c) => ({ value: c.id, label: categoryName(c) }))} value={chosenCategoryId} onChange={setCategoryId} />
      </Group>
      <Group title={t('recurring.account')}>
        <Chips options={accounts.active.map((a) => ({ value: a.id, label: a.name }))} value={chosenAccountId} onChange={setAccountId} />
      </Group>
      <Group title={t('recurring.schedule')}>
        <Segmented
          options={[
            { value: 'monthly' as const, label: t('recurring.monthly') },
            { value: 'weekly' as const, label: t('recurring.weekly') },
          ]}
          value={schedule}
          onChange={setSchedule}
        />
      </Group>
      <Group>
        {schedule === 'monthly' ? (
          <Field label={t('recurring.dayOfMonth')} latin value={dayOfMonth} onChangeText={setDayOfMonth} keyboardType="number-pad" maxLength={2} />
        ) : (
          <Chips options={[0, 1, 2, 3, 4, 5, 6].map((d) => ({ value: String(d), label: t(`weekdays.${d}`) }))} value={weekday} onChange={setWeekday} />
        )}
        {existing ? <DateField label={t('recurring.nextDue')} value={nextDue} text={formatDate(nextDue)} onChange={setNextDue} /> : null}
        <Row label={t('recurring.active')} right={<Switch accessibilityLabel={t('recurring.active')} value={active} onValueChange={setActive} />} />
      </Group>
      {submitted ? <ErrorText>{error}</ErrorText> : null}
      {existing ? <Button variant="destructive" title={t('recurring.archive')} onPress={onArchive} /> : null}
    </Screen>
  );
}
