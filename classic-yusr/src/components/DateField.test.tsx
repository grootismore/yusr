import { fireEvent, render, screen } from '@testing-library/react-native';
import { initI18n } from '@/lib/i18n';
import { DateField, todayAndYesterday } from './DateField';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItemSync: jest.fn(() => null), setItemSync: jest.fn() } }));
jest.mock('@react-native-community/datetimepicker', () => {
  const { Text } = jest.requireActual('react-native');
  return { __esModule: true, default: () => <Text>calendar</Text>, DateTimePickerAndroid: { open: jest.fn() } };
});

beforeAll(async () => {
  await initI18n();
});

describe('todayAndYesterday', () => {
  it('steps back one calendar day, across a month or year end', () => {
    expect(todayAndYesterday(new Date(2026, 10, 3, 9))).toEqual({ today: '2026-11-03', yesterday: '2026-11-02' });
    expect(todayAndYesterday(new Date(2026, 0, 1, 23))).toEqual({ today: '2026-01-01', yesterday: '2025-12-31' });
  });
});

describe('date field', () => {
  const { today, yesterday } = todayAndYesterday();

  it('sets today or yesterday with one tap and shows which one is chosen', async () => {
    const onChange = jest.fn();
    await render(<DateField label="Date" value="2026-01-15" text="15 Jan ’26" onChange={onChange} />);
    await fireEvent.press(screen.getByText('Yesterday'));
    expect(onChange).toHaveBeenCalledWith(yesterday);
    await fireEvent.press(screen.getByText('Today'));
    expect(onChange).toHaveBeenCalledWith(today);
  });

  it('writes the date out on a row, and opens a full calendar below it when tapped', async () => {
    await render(<DateField label="Date" value="2026-01-15" text="15 Jan ’26" onChange={jest.fn()} />);
    expect(screen.getByText('15 Jan ’26')).toBeTruthy();
    expect(screen.queryByText('calendar')).toBeNull();
    await fireEvent.press(screen.getByText('15 Jan ’26'));
    expect(screen.getByText('calendar')).toBeTruthy(); // any past date is a few taps away
  });
});
