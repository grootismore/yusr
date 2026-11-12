import { useState } from 'react';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { fromISODate, toISODate } from '@/features/transactions/logic';
import { Chips, Row } from './ui';

/** Local "today" and "yesterday" as YYYY-MM-DD. */
export function todayAndYesterday(now: Date = new Date()): { today: string; yesterday: string } {
  return { today: toISODate(now), yesterday: toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)) };
}

/**
 * Date control that is easy to see and use: the date is written out on a row you can tap, with
 * "Today" and "Yesterday" under it for the common cases. On iPhone, tapping the row opens a full
 * calendar below it so any past date is a few taps away (back-dating a payment or an old expense);
 * on Android it opens the system dialog.
 */
export function DateField({
  label,
  value,
  text,
  onChange,
}: {
  label: string;
  value: string;
  /** The date written out, e.g. "3 Nov ’26". */
  text: string;
  onChange: (iso: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { today, yesterday } = todayAndYesterday();
  const quick = value === today ? 'today' : value === yesterday ? 'yesterday' : null;
  return (
    <>
      <Row
        label={label}
        value={text}
        chevron
        onPress={() => {
          if (Platform.OS === 'ios') setOpen(!open);
          else
            DateTimePickerAndroid.open({
              value: fromISODate(value),
              mode: 'date',
              onChange: (_event, date) => date && onChange(toISODate(date)),
            });
        }}
      />
      <Chips
        options={[
          { value: 'today', label: t('common.today') },
          { value: 'yesterday', label: t('common.yesterday') },
        ]}
        value={quick}
        onChange={(choice) => {
          onChange(choice === 'today' ? today : yesterday);
          setOpen(false);
        }}
      />
      {Platform.OS === 'ios' && open ? (
        <DateTimePicker
          value={fromISODate(value)}
          mode="date"
          display="inline"
          onChange={(_event, date) => date && onChange(toISODate(date))}
        />
      ) : null}
    </>
  );
}
