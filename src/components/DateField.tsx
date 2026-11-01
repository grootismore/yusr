import { Platform } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { fromISODate, toISODate } from '@/features/transactions/logic';
import { Row } from './ui';

/** Native date control: compact picker on iOS, system dialog on Android. */
export function DateField({
  label,
  value,
  text,
  onChange,
}: {
  label: string;
  value: string;
  /** Formatted date shown on Android. */
  text: string;
  onChange: (iso: string) => void;
}) {
  if (Platform.OS === 'ios') {
    return (
      <Row
        label={label}
        right={
          <DateTimePicker
            value={fromISODate(value)}
            mode="date"
            display="compact"
            onChange={(_event, date) => date && onChange(toISODate(date))}
          />
        }
      />
    );
  }
  return (
    <Row
      label={label}
      value={text}
      onPress={() =>
        DateTimePickerAndroid.open({
          value: fromISODate(value),
          mode: 'date',
          onChange: (_event, date) => date && onChange(toISODate(date)),
        })
      }
    />
  );
}
