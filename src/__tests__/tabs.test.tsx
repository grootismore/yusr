import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react-native';
import { initI18n } from '@/lib/i18n';
import TabsLayout from '../../app/(tabs)/_layout';

// Stand-ins for the native tab bar: render each tab's name, label and icon so the test can read them.
const mockTriggers: { name: string; label: string; icon: Record<string, unknown> }[] = [];
jest.mock('expo-router/native-tabs', () => {
  const React = jest.requireActual('react');
  const Trigger = ({ name, children }: { name: string; children?: ReactNode }) => {
    const parts = React.Children.toArray(children) as { props: Record<string, unknown>; type: { displayName?: string } }[];
    const label = parts.find((p) => p.type.displayName === 'Label')?.props.children as string;
    const icon = parts.find((p) => p.type.displayName === 'Icon')?.props ?? {};
    mockTriggers.push({ name, label, icon });
    return React.createElement(jest.requireActual('react-native').Text, null, label);
  };
  Trigger.Label = Object.assign(() => null, { displayName: 'Label' });
  Trigger.Icon = Object.assign(() => null, { displayName: 'Icon' });
  const NativeTabs = Object.assign(({ children }: { children?: ReactNode }) => React.createElement(React.Fragment, null, children), { Trigger });
  return { NativeTabs };
});
jest.mock('@/features/reminders/useReminderSync', () => ({ useReminderSync: jest.fn() }));

describe('tab bar', () => {
  beforeAll(async () => {
    await initI18n();
  });

  beforeEach(() => {
    mockTriggers.length = 0;
  });

  it('is the native tab bar with the five PRD tabs, single-word labels and an SF Symbol and Material icon each', async () => {
    await render(<TabsLayout />);
    expect(mockTriggers.map((t) => t.name)).toEqual(['(home)', 'transactions', 'debts', 'giving', 'more']);
    expect(mockTriggers.map((t) => t.label)).toEqual(['Home', 'Transactions', 'Debts', 'Sadaqat', 'More']);
    for (const t of mockTriggers) {
      expect(t.label.split(' ')).toHaveLength(1);
      expect(t.icon.sf).toBeTruthy();
      expect(t.icon.md).toBeTruthy();
    }
    expect(screen.getByText('Sadaqat')).toBeTruthy();
  });
});
