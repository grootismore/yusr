import { fireEvent, render, screen } from '@testing-library/react-native';
import { initI18n } from '@/lib/i18n';
import { GettingStarted } from './GettingStarted';
import { openSteps } from './gettingStarted';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItemSync: jest.fn(() => null), setItemSync: jest.fn() } }));

beforeAll(async () => {
  await initI18n();
});
beforeEach(() => jest.clearAllMocks());

describe('openSteps', () => {
  it('lists what is left, and is empty once everything is done', () => {
    expect(openSteps({ transaction: true, debt: false, plan: false })).toEqual(['debt', 'plan']);
    expect(openSteps({ transaction: true, debt: true, plan: true })).toEqual([]);
  });
});

describe('getting started card', () => {
  it('opens the right form for each step that is still open', async () => {
    await render(<GettingStarted done={{ transaction: false, debt: false, plan: false }} />);
    await fireEvent.press(screen.getByText('Record your first spending or income'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/transaction' });
    await fireEvent.press(screen.getByText('Add a debt you owe, if you have one'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/debts/debt' });
    await fireEvent.press(screen.getByText('Plan a Sadaqat, if you want reminders'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/giving/commitment' });
  });

  it('does not open a step that is already done', async () => {
    await render(<GettingStarted done={{ transaction: true, debt: false, plan: false }} />);
    await fireEvent.press(screen.getByText('Record your first spending or income'));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('goes away by itself when everything is done', async () => {
    await render(<GettingStarted done={{ transaction: true, debt: true, plan: true }} />);
    expect(screen.queryByText('Getting started')).toBeNull();
  });

  it('can be hidden, and stays hidden', async () => {
    const { rerender } = await render(<GettingStarted done={{ transaction: false, debt: false, plan: false }} />);
    expect(screen.getByText('Getting started')).toBeTruthy();
    await fireEvent.press(screen.getByText('Hide this'));
    expect(screen.queryByText('Getting started')).toBeNull();
    await rerender(<GettingStarted done={{ transaction: false, debt: false, plan: false }} />);
    expect(screen.queryByText('Getting started')).toBeNull();
  });
});
