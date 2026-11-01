import { fireEvent, render, screen } from '@testing-library/react-native';
import type { Account, Category, Transaction } from '@/features/transactions/types';
import { i18n, initI18n } from '@/lib/i18n';
import HomeScreen from '../../app/(tabs)/(home)/index';
import TransactionScreen from '../../app/transaction';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    useRouter: () => ({ back: mockBack, push: mockPush, replace: mockReplace }),
    useLocalSearchParams: () => mockParams,
    // Render the header buttons so tests can press Save / Cancel like a user would.
    Stack: {
      Screen: ({ options }: { options?: { headerLeft?: () => unknown; headerRight?: () => unknown } }) =>
        React.createElement(React.Fragment, null, options?.headerLeft?.(), options?.headerRight?.()),
    },
  };
});
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
}));
jest.mock('expo-localization', () => ({ getLocales: () => [] }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: () => null,
  DateTimePickerAndroid: { open: jest.fn() },
}));

const mockSave = jest.fn();
const mockRemove = jest.fn();
const state = {
  accounts: [] as Account[],
  categories: [] as Category[],
  transactions: [] as Transaction[],
  ready: true,
  pending: 0,
};
jest.mock('@/features/transactions/hooks', () => ({
  useAccounts: () => ({ all: state.accounts, active: state.accounts.filter((a) => a.deleted_at === null) }),
  useCategories: () => ({ all: state.categories, active: state.categories.filter((c) => c.deleted_at === null) }),
  useTransactions: () => state.transactions,
  useDataReady: () => state.ready,
  usePendingChanges: () => state.pending,
  useSaveTransaction: () => mockSave,
  useSoftDelete: () => mockRemove,
}));

const stamp = { created_at: '2026-11-01T00:00:00Z', updated_at: '', deleted_at: null };
const cash: Account = { id: 'a-cash', user_id: 'u', name: 'Cash', type: 'cash', opening_balance_laari: 100000, ...stamp };
const bml: Account = { id: 'a-bml', user_id: 'u', name: 'BML', type: 'bml', opening_balance_laari: 0, ...stamp };
const cat = (id: string, name: string, kind: Category['kind']): Category => ({
  id, user_id: null, name_en: name, name_dv: name, kind, is_default: true, ...stamp,
});
const groceries = cat('c-groc', 'Groceries', 'expense');
const salary = cat('c-sal', 'Salary', 'income');

beforeAll(async () => {
  await initI18n();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  state.accounts = [cash, bml];
  state.categories = [groceries, salary];
  state.transactions = [];
  state.ready = true;
  state.pending = 0;
  i18n.changeLanguage('en');
});

describe('transaction sheet', () => {
  it('saves an expense with the typed amount, chosen category and default account, then closes', async () => {
    await render(<TransactionScreen />);
    await fireEvent.changeText(screen.getByLabelText('Amount (MVR)'), '12.50');
    await fireEvent.press(screen.getByText('Groceries'));
    await fireEvent.press(screen.getByText('Save'));
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        account_id: 'a-cash',
        category_id: 'c-groc',
        amount_laari: 1250,
        kind: 'expense',
        note: null,
      }),
      undefined,
    );
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('saves to the account the user picks, with a trimmed note', async () => {
    await render(<TransactionScreen />);
    await fireEvent.changeText(screen.getByLabelText('Amount (MVR)'), '1,000');
    await fireEvent.press(screen.getByText('Groceries'));
    await fireEvent.press(screen.getByText('BML'));
    await fireEvent.changeText(screen.getByLabelText('Note (optional)'), '  weekly shop ');
    await fireEvent.press(screen.getByText('Save'));
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({ account_id: 'a-bml', amount_laari: 100000, note: 'weekly shop' }),
      undefined,
    );
  });

  it.each([
    ['', 'Groceries', 'Enter an amount greater than zero.'],
    ['0', 'Groceries', 'Enter an amount greater than zero.'],
    ['12.345', 'Groceries', 'Enter an amount greater than zero.'],
    ['abc', 'Groceries', 'Enter an amount greater than zero.'],
    ['10', null, 'Choose a category.'],
  ])('refuses to save amount %j with category %j and says why', async (amount, category, message) => {
    await render(<TransactionScreen />);
    await fireEvent.changeText(screen.getByLabelText('Amount (MVR)'), amount);
    if (category) await fireEvent.press(screen.getByText(category));
    await fireEvent.press(screen.getByText('Save'));
    expect(mockSave).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
    expect(screen.getByText(message)).toBeTruthy();
  });

  it('forgets a chosen category when the kind changes to one that does not contain it', async () => {
    await render(<TransactionScreen />);
    await fireEvent.changeText(screen.getByLabelText('Amount (MVR)'), '10');
    await fireEvent.press(screen.getByText('Groceries'));
    await fireEvent.press(screen.getByText('Income'));
    await fireEvent.press(screen.getByText('Save'));
    expect(mockSave).not.toHaveBeenCalled();
    expect(screen.getByText('Choose a category.')).toBeTruthy();
  });

  it('updates the existing transaction instead of creating a new one', async () => {
    state.transactions = [
      { id: 't1', user_id: 'u', account_id: 'a-bml', category_id: 'c-groc', amount_laari: 125050, kind: 'expense',
        occurred_on: '2026-11-03', note: null, debt_id: null, commitment_id: null, ...stamp },
    ];
    mockParams = { id: 't1' };
    await render(<TransactionScreen />);
    await fireEvent.changeText(screen.getByLabelText('Amount (MVR)'), '99.00');
    await fireEvent.press(screen.getByText('Save'));
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({ amount_laari: 9900, account_id: 'a-bml', occurred_on: '2026-11-03' }),
      expect.objectContaining({ id: 't1' }),
    );
  });

  it('only offers categories of the selected kind', async () => {
    await render(<TransactionScreen />);
    expect(screen.getByText('Groceries')).toBeTruthy();
    expect(screen.queryByText('Salary')).toBeNull();
    await fireEvent.press(screen.getByText('Income'));
    expect(screen.getByText('Salary')).toBeTruthy();
    expect(screen.queryByText('Groceries')).toBeNull();
  });

  it('asks for an account first when none exist', async () => {
    state.accounts = [];
    await render(<TransactionScreen />);
    expect(screen.getByText('Add an account first')).toBeTruthy();
    await fireEvent.press(screen.getByText('Add account'));
    expect(mockReplace).toHaveBeenCalledWith('/more/account');
  });

  it('prefills an existing transaction for editing and offers delete', async () => {
    state.transactions = [
      { id: 't1', user_id: 'u', account_id: 'a-bml', category_id: 'c-groc', amount_laari: 125050, kind: 'expense',
        occurred_on: '2026-11-03', note: 'weekly shop', debt_id: null, commitment_id: null, ...stamp },
    ];
    mockParams = { id: 't1' };
    await render(<TransactionScreen />);
    expect(screen.getByLabelText('Amount (MVR)').props.value).toBe('1,250.50');
    expect(screen.getByLabelText('Note (optional)').props.value).toBe('weekly shop');
    expect(screen.getByText('Delete transaction')).toBeTruthy();
  });

  it('renders nothing for an unknown transaction id', async () => {
    mockParams = { id: 'missing' };
    const { toJSON } = await render(<TransactionScreen />);
    expect(toJSON()).toBeNull();
  });
});

describe('home', () => {
  it('invites the user to add an account when there is none', async () => {
    state.accounts = [];
    await render(<HomeScreen />);
    expect(screen.getByText('Add your first account')).toBeTruthy();
    await fireEvent.press(screen.getByText('Add account'));
    expect(mockPush).toHaveBeenCalledWith('/more/account');
  });

  it('shows derived balances and month totals', async () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    state.transactions = [
      { id: 't1', user_id: 'u', account_id: 'a-cash', category_id: 'c-sal', amount_laari: 500000, kind: 'income',
        occurred_on: today, note: null, debt_id: null, commitment_id: null, ...stamp },
      { id: 't2', user_id: 'u', account_id: 'a-cash', category_id: 'c-groc', amount_laari: 125050, kind: 'expense',
        occurred_on: today, note: null, debt_id: null, commitment_id: null, ...stamp },
    ];
    await render(<HomeScreen />);
    expect(screen.getByText('MVR 5,000.00')).toBeTruthy(); // income
    expect(screen.getAllByText('MVR 1,250.50').length).toBeGreaterThan(0); // expense
    expect(screen.getByText('MVR 3,749.50')).toBeTruthy(); // net
    // Cash balance: 1,000.00 opening + 5,000.00 - 1,250.50
    expect(screen.getByText('MVR 4,749.50')).toBeTruthy();
    expect(screen.getByText('Groceries · 100%')).toBeTruthy();
  });

  it('renders in Dhivehi without missing strings', async () => {
    i18n.changeLanguage('dv');
    await render(<HomeScreen />);
    expect(screen.queryByText(/home\./)).toBeNull(); // no raw translation keys leaking
    expect(screen.getByText('އާމްދަނީ')).toBeTruthy();
  });
});
