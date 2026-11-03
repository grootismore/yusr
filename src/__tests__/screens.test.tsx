import { ActionSheetIOS, Alert, Linking, Share } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { Debt, Receivable } from '@/features/debts/types';
import type { Commitment } from '@/features/giving/types';
import type { AuditEntry, TrustedContact } from '@/features/transactions/hooks';
import { currentOccurrence } from '@/features/giving/schedule';
import type { Account, Category, RecurringItem, Transaction } from '@/features/transactions/types';
import { i18n, initI18n } from '@/lib/i18n';
import AuditLogScreen from '../../app/(tabs)/more/audit-log';
import ContactInviteScreen from '../../app/(tabs)/more/contact-invite';
import ContactsScreen from '../../app/(tabs)/more/contacts';
import WasiyyahNoteScreen from '../../app/(tabs)/more/wasiyyah-note';
import WasiyyahShareScreen from '../../app/(tabs)/more/wasiyyah-share';
import WasiyyahScreen from '../../app/(tabs)/more/wasiyyah';
import RecurringItemScreen from '../../app/(tabs)/more/recurring-item';
import RecurringScreen from '../../app/(tabs)/more/recurring';
import CommitmentScreen from '../../app/(tabs)/giving/commitment';
import GivingScreen from '../../app/(tabs)/giving/index';
import TransactionsScreen from '../../app/(tabs)/transactions/index';
import AboutScreen from '../../app/(tabs)/more/about';
import SettingsScreen from '../../app/(tabs)/more/settings';
import DebtFormScreen from '../../app/(tabs)/debts/debt';
import DebtsScreen from '../../app/(tabs)/debts/index';
import HomeScreen from '../../app/(tabs)/(home)/index';
import TransactionScreen from '../../app/transaction';
import AccountScreen from '../../app/(tabs)/more/account';

const mockBack = jest.fn();
const mockDisable = jest.fn();
const mockPrevent: { prevent: boolean; callback?: (o: { data: { action: unknown }; repeat: () => void }) => void } = { prevent: false };
const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};

// The native search bar's callbacks, captured from the header options so a test can type into it.
const mockSearchBar: { current?: { placeholder: string; onChangeText: (e: { nativeEvent: { text: string } }) => void } } = {};
jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    useRouter: () => ({ back: mockBack, push: mockPush, replace: mockReplace }),
    useLocalSearchParams: () => mockParams,
    // Records the unsaved-changes guard so a test can see when it is armed and answer its question.
    usePreventRemove: (prevent: boolean, callback: typeof mockPrevent.callback) => {
      mockPrevent.prevent = prevent;
      mockPrevent.callback = callback;
      return mockDisable;
    },
    // Render the header buttons so tests can press Save / Cancel like a user would.
    Stack: {
      Screen: ({ options }: { options?: { headerLeft?: () => unknown; headerRight?: () => unknown; headerSearchBarOptions?: unknown } }) => {
        mockSearchBar.current = options?.headerSearchBarOptions as typeof mockSearchBar.current;
        return React.createElement(React.Fragment, null, options?.headerLeft?.(), options?.headerRight?.());
      },
    },
  };
});
jest.mock('expo-screen-capture', () => ({ usePreventScreenCapture: jest.fn() }));
jest.mock('expo-crypto', () => ({
  getRandomBytes: (n: number) => new Uint8Array(n).fill(7),
  digestStringAsync: async (_a: string, text: string) => `hash-of-${text}`,
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  randomUUID: () => 'uuid',
}));
jest.mock('@/features/reminders/notifications', () => ({
  requestReminderPermission: jest.fn(async () => true),
  reminderPermissionGranted: jest.fn(async () => true),
  cancelReminders: jest.fn(async () => undefined),
  scheduleReminders: jest.fn(async () => undefined),
}));
jest.mock('@/lib/auth/AuthProvider', () => ({ useAuth: () => ({ signOut: jest.fn() }) }));
jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: { getItemSync: jest.fn(() => null), setItemSync: jest.fn() },
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
}));
jest.mock('expo-localization', () => ({ getLocales: () => [] }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-linear-gradient', () => {
  const { View } = jest.requireActual('react-native');
  const React = jest.requireActual('react');
  return { LinearGradient: ({ children, ...props }: { children?: unknown }) => React.createElement(View, props, children) };
});
jest.mock('react-native-svg', () => ({ __esModule: true, default: () => null, Path: () => null }));
jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: () => null,
  DateTimePickerAndroid: { open: jest.fn() },
}));

const mockSave = jest.fn();
const mockSaveAccount = jest.fn();
const mockRemove = jest.fn();
const mockSaveDebt = jest.fn((_input: unknown, existing?: { id: string }) => existing?.id ?? 'new-debt-id');
const mockSaveSecrets = jest.fn();
const mockSaveCommitment = jest.fn();
const mockUpdateProfile = jest.fn();
const mockInvite = jest.fn(async (_input: unknown) => 'TOKEN-FROM-SERVER');
const mockRevoke = jest.fn(async (_id: string) => undefined);
const mockSaveNote = jest.fn();
const mockLogShared = jest.fn(async (_sections: string[]) => undefined);
const mockSaveRecurring = jest.fn((_input: unknown, existing?: { id: string }) => existing?.id ?? 'new-recurring-id');
const state = {
  accounts: [] as Account[],
  categories: [] as Category[],
  transactions: [] as Transaction[],
  debts: [] as Debt[],
  receivables: [] as Receivable[],
  commitments: [] as Commitment[],
  recurring: [] as RecurringItem[],
  contacts: [] as TrustedContact[],
  audit: [] as AuditEntry[],
  note: null as string | null,
  secretsList: [] as [string, { reference_no: string; notes: string }][],
  privacy: false,
  secrets: null as { reference_no: string; notes: string } | null,
  ready: true,
  pending: 0,
};
jest.mock('@/features/account/DeletionBanner', () => ({ DeletionBanner: () => null }));
jest.mock('@/features/transactions/hooks', () => ({
  useRefresh: () => ({ refreshing: false, onRefresh: () => undefined }),
  useAccounts: () => ({ all: state.accounts, active: state.accounts.filter((a) => a.deleted_at === null) }),
  useCategories: () => ({ all: state.categories, active: state.categories.filter((c) => c.deleted_at === null) }),
  useTransactions: () => state.transactions,
  useDataReady: () => state.ready,
  usePendingChanges: () => state.pending,
  useSaveTransaction: () => mockSave,
  useSaveAccount: () => mockSaveAccount,
  useSoftDelete: () => mockRemove,
  useDebts: () => ({ all: state.debts, active: state.debts.filter((d) => d.deleted_at === null) }),
  useReceivables: () => ({ all: state.receivables, active: state.receivables.filter((r) => r.deleted_at === null) }),
  useCommitments: () => ({ all: state.commitments, active: state.commitments.filter((c) => c.deleted_at === null) }),
  useSaveCommitment: () => mockSaveCommitment,
  useRecurringItems: () => ({ all: state.recurring, active: state.recurring.filter((r) => r.deleted_at === null) }),
  useSaveRecurring: () => mockSaveRecurring,
  useContacts: () => ({ all: state.contacts, current: state.contacts.filter((c) => c.status !== 'revoked') }),
  useInviteContact: () => ({ invite: mockInvite, pending: false }),
  useRevokeContact: () => ({ revoke: mockRevoke }),
  useWasiyyahNote: () => state.note ?? undefined,
  useSaveWasiyyahNote: () => mockSaveNote,
  useAuditLog: () => state.audit,
  useLogRegisterShared: () => mockLogShared,
  useDebtSecretsMap: () => new Map(state.secretsList),
  useProfile: () => ({ privacyMode: state.privacy, hijriAdjustment: 0 }),
  useUpdateProfile: () => mockUpdateProfile,
  useSaveDebt: () => mockSaveDebt,
  useSaveDebtSecrets: () => mockSaveSecrets,
  useDebtSecrets: () => ({ data: state.secrets ?? undefined }),
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
  state.debts = [];
  state.receivables = [];
  state.commitments = [];
  state.recurring = [];
  state.contacts = [];
  state.audit = [];
  state.note = null;
  state.secretsList = [];
  process.env.EXPO_PUBLIC_INVITE_URL = 'https://invite.example/accept';
  state.privacy = false;
  state.secrets = null;
  state.ready = true;
  state.pending = 0;
  i18n.changeLanguage('en');
});

describe('unsaved-changes guard on the other forms', () => {
  it('is armed once a field of the account, giving or recurring form changes', async () => {
    await render(<AccountScreen />);
    expect(mockPrevent.prevent).toBe(false);
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Savings');
    expect(mockPrevent.prevent).toBe(true);

    await render(<CommitmentScreen />);
    expect(mockPrevent.prevent).toBe(false);
    await fireEvent.changeText(screen.getByLabelText('Amount (MVR)'), '100');
    expect(mockPrevent.prevent).toBe(true);

    await render(<RecurringItemScreen />);
    expect(mockPrevent.prevent).toBe(false);
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Rent');
    expect(mockPrevent.prevent).toBe(true);
  });
});

describe('transaction sheet', () => {
  it('asks before a changed form is closed, and not when nothing changed or after saving', async () => {
    const sheet = jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation(() => undefined);
    await render(<TransactionScreen />);
    expect(mockPrevent.prevent).toBe(false); // untouched: closes straight away

    await fireEvent.changeText(screen.getByLabelText('Amount (MVR)'), '12.50');
    expect(mockPrevent.prevent).toBe(true);
    const repeat = jest.fn();
    mockPrevent.callback?.({ data: { action: {} }, repeat }); // Cancel, back or a swipe down
    const [options, choose] = sheet.mock.calls[0];
    expect(options).toMatchObject({ title: 'Discard changes?', options: ['Discard', 'Keep editing'], cancelButtonIndex: 1 });
    choose(1);
    expect(repeat).not.toHaveBeenCalled(); // keeps the form
    choose(0);
    expect(repeat).toHaveBeenCalledTimes(1); // closes it

    mockDisable.mockClear();
    await fireEvent.press(screen.getByText('Groceries'));
    await fireEvent.press(screen.getByText('Save'));
    expect(mockDisable).toHaveBeenCalled(); // saving closes without asking
    sheet.mockRestore();
  });

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

  it('saves once however many times Save is tapped (a double tap used to create duplicates)', async () => {
    await render(<TransactionScreen />);
    await fireEvent.changeText(screen.getByLabelText('Amount (MVR)'), '12.50');
    await fireEvent.press(screen.getByText('Groceries'));
    await fireEvent.press(screen.getByText('Save'));
    await fireEvent.press(screen.getByText('Save'));
    await fireEvent.press(screen.getByText('Save'));
    expect(mockSave).toHaveBeenCalledTimes(1);
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
    expect(screen.getAllByText('MVR 3,749.50').length).toBeGreaterThan(0); // net (and safe to spend, with nothing set aside)
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


const debt = (over: Partial<Debt> = {}): Debt => ({
  id: 'd1', user_id: 'u', lender: 'BML loan', kind: 'bank', original_laari: 1000000, balance_laari: 600000,
  min_payment_laari: 50000, due_day: 15, is_interest_bearing: false, interest_rate_bps: null,
  reference_secret_id: null, notes_secret_id: null, ...stamp, ...({} as object), ...over,
});
const payment = (amount: number): Transaction => ({
  id: `pay-${amount}`, user_id: 'u', account_id: 'a-cash', category_id: 'c-groc', amount_laari: amount, kind: 'expense',
  occurred_on: '2026-11-03', note: null, debt_id: 'd1', commitment_id: null, ...stamp,
});

describe('debts tab', () => {
  it('invites the user to add a first debt when there is nothing yet', async () => {
    await render(<DebtsScreen />);
    expect(screen.getByText('No debts recorded')).toBeTruthy();
    await fireEvent.press(screen.getByText('Add debt'));
    expect(mockPush).toHaveBeenCalledWith('/debts/debt');
  });

  it('shows what is owed (net of payments) and when the debts clear', async () => {
    state.debts = [debt()];
    state.transactions = [payment(100000)]; // 6,000.00 - 1,000.00 = 5,000.00 still owed
    await render(<DebtsScreen />);
    expect(screen.getAllByText('MVR 5,000.00').length).toBeGreaterThan(0);
    // 5,000.00 at 500.00 a month, from next month: ten payments.
    expect(screen.getByText(/Debt-free by/)).toBeTruthy();
    expect(screen.getByText(/Cleared by/)).toBeTruthy();
  });

  it('says so, instead of crashing, when interest outruns payments', async () => {
    state.debts = [debt({ is_interest_bearing: true, interest_rate_bps: 100000, min_payment_laari: 100 })];
    await render(<DebtsScreen />);
    expect(screen.getByText(/won't clear/)).toBeTruthy();
  });
});

describe('debt form', () => {
  it('saves the debt with amounts in laari and a rate in basis points', async () => {
    await render(<DebtFormScreen />);
    await fireEvent.changeText(screen.getByLabelText('Lender'), '  Ali  ');
    await fireEvent.changeText(screen.getByLabelText('Current balance (MVR)'), '2,500.50');
    await fireEvent.changeText(screen.getByLabelText('Minimum payment (MVR)'), '300');
    await fireEvent.changeText(screen.getByLabelText('Due day of month (optional)'), '31');
    await fireEvent(screen.getByLabelText('Charges interest'), 'valueChange', true);
    await fireEvent.changeText(screen.getByLabelText('Annual interest rate % (optional)'), '12.5');
    await fireEvent.press(screen.getByText('Save'));
    expect(mockSaveDebt).toHaveBeenCalledWith(
      expect.objectContaining({
        lender: 'Ali',
        kind: 'bank',
        balance_laari: 250050,
        original_laari: 250050, // defaults to the current balance when left empty
        min_payment_laari: 30000,
        due_day: 31,
        is_interest_bearing: true,
        interest_rate_bps: 1250,
      }),
      undefined,
    );
    expect(mockBack).toHaveBeenCalled();
    expect(mockSaveSecrets).not.toHaveBeenCalled(); // nothing typed in the encrypted fields
  });

  it.each([
    ['', '100', '', 'Enter who the debt is owed to.'],
    ['Ali', '', '', 'Enter a valid amount, like 1,250.00.'],
    ['Ali', 'abc', '', 'Enter a valid amount, like 1,250.00.'],
    ['Ali', '100', '40', 'Enter a day from 1 to 31.'],
  ])('refuses lender %j balance %j day %j', async (lender, balance, day, message) => {
    await render(<DebtFormScreen />);
    await fireEvent.changeText(screen.getByLabelText('Lender'), lender);
    await fireEvent.changeText(screen.getByLabelText('Current balance (MVR)'), balance);
    await fireEvent.changeText(screen.getByLabelText('Due day of month (optional)'), day);
    await fireEvent.press(screen.getByText('Save'));
    expect(mockSaveDebt).not.toHaveBeenCalled();
    expect(screen.getByText(message)).toBeTruthy();
  });

  it('stores the encrypted fields only when the user edits them', async () => {
    await render(<DebtFormScreen />);
    await fireEvent.changeText(screen.getByLabelText('Lender'), 'Ali');
    await fireEvent.changeText(screen.getByLabelText('Current balance (MVR)'), '100');
    await fireEvent.changeText(screen.getByLabelText('Reference or account number'), 'ACC-77');
    await fireEvent.press(screen.getByText('Save'));
    expect(mockSaveSecrets).toHaveBeenCalledWith('new-debt-id', { reference_no: 'ACC-77', notes: '' });
  });

  it('keeps the stored notes when only the reference is changed', async () => {
    state.debts = [debt()];
    state.secrets = { reference_no: 'OLD-REF', notes: 'call Ali first' };
    mockParams = { id: 'd1' };
    await render(<DebtFormScreen />);
    expect(screen.getByLabelText('Notes').props.value).toBe('call Ali first');
    await fireEvent.changeText(screen.getByLabelText('Reference or account number'), 'NEW-REF');
    await fireEvent.press(screen.getByText('Save'));
    expect(mockSaveSecrets).toHaveBeenCalledWith('d1', { reference_no: 'NEW-REF', notes: 'call Ali first' });
  });

  it('does not touch stored secrets when the user changes nothing about them', async () => {
    state.debts = [debt()];
    state.secrets = { reference_no: 'OLD-REF', notes: 'call Ali first' };
    mockParams = { id: 'd1' };
    await render(<DebtFormScreen />);
    await fireEvent.changeText(screen.getByLabelText('Lender'), 'BML loan (renamed)');
    await fireEvent.press(screen.getByText('Save'));
    expect(mockSaveDebt).toHaveBeenCalled();
    expect(mockSaveSecrets).not.toHaveBeenCalled();
  });

  it('corrects the starting balance so the derived balance equals what the user typed', async () => {
    state.debts = [debt()]; // started at 6,000.00
    state.transactions = [payment(100000)]; // 1,000.00 paid, so the screen shows 5,000.00
    mockParams = { id: 'd1' };
    await render(<DebtFormScreen />);
    expect(screen.getByLabelText('Current balance (MVR)').props.value).toBe('5,000.00');
    await fireEvent.changeText(screen.getByLabelText('Current balance (MVR)'), '4,500');
    await fireEvent.press(screen.getByText('Save'));
    // stored starting balance = 4,500.00 owed now + 1,000.00 already paid
    expect(mockSaveDebt).toHaveBeenCalledWith(expect.objectContaining({ balance_laari: 550000 }), expect.objectContaining({ id: 'd1' }));
  });
});

describe('logging a debt payment from the transaction sheet', () => {
  it('prefills an expense in the Debt payment category, links the debt and hides the kind switch', async () => {
    state.categories = [...state.categories, cat('c-debt', 'Debt payment', 'expense')];
    state.debts = [debt()];
    mockParams = { debtId: 'd1' };
    await render(<TransactionScreen />);
    expect(screen.getByLabelText('Amount (MVR)').props.value).toBe('500.00'); // the minimum payment
    expect(screen.queryByText('Income')).toBeNull(); // kind is locked
    await fireEvent.press(screen.getByText('Save'));
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'expense', category_id: 'c-debt', amount_laari: 50000, debt_id: 'd1' }),
      undefined,
    );
  });

  it('caps the prefilled payment at what is still owed', async () => {
    state.categories = [...state.categories, cat('c-debt', 'Debt payment', 'expense')];
    state.debts = [debt({ balance_laari: 30000 })];
    mockParams = { debtId: 'd1' };
    await render(<TransactionScreen />);
    expect(screen.getByLabelText('Amount (MVR)').props.value).toBe('300.00');
  });
});


const friday = (over: Partial<Commitment> = {}): Commitment => ({
  id: 'g1', user_id: 'u', type: 'sadaqah', amount_laari: 5000, schedule: 'weekly_friday', due_on: null, day_of_month: null,
  recipient_note: 'Mosque fund', reminder_enabled: true, active: true, ...stamp, ...over,
});
const today = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};
const gave = (on: string, over: Partial<Transaction> = {}): Transaction => ({
  id: `give-${on}`, user_id: 'u', account_id: 'a-cash', category_id: 'c-give', amount_laari: 5000, kind: 'giving',
  occurred_on: on, note: null, debt_id: null, commitment_id: 'g1', ...stamp, ...over,
});

describe('giving tab', () => {
  it('invites the user to plan their first giving', async () => {
    await render(<GivingScreen />);
    expect(screen.getByText('No Sadaqat set up')).toBeTruthy();
    await fireEvent.press(screen.getByText('Add Sadaqat'));
    expect(mockPush).toHaveBeenCalledWith('/giving/commitment');
  });

  it('lists a commitment with its amount, recipient and a Mark done action', async () => {
    state.commitments = [friday()];
    await render(<GivingScreen />);
    expect(screen.getByText('Sadaqah')).toBeTruthy();
    expect(screen.getByText('MVR 50.00')).toBeTruthy();
    expect(screen.getByText('Mosque fund')).toBeTruthy();
    await fireEvent.press(screen.getByText('Mark done'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/transaction', params: { commitmentId: 'g1' } });
  });

  it('shows Done instead of Mark done once this Friday is logged', async () => {
    const c = friday();
    const occurrence = currentOccurrence(c, today());
    state.commitments = [c];
    state.transactions = [gave(occurrence?.end ?? today())];
    await render(<GivingScreen />);
    expect(screen.getByText('Done')).toBeTruthy();
    expect(screen.queryByText('Mark done')).toBeNull();
  });

  it('private mode hides the amount and the recipient, and speaks "Hidden"', async () => {
    state.commitments = [friday()];
    state.privacy = true;
    await render(<GivingScreen />);
    expect(screen.queryByText('MVR 50.00')).toBeNull();
    expect(screen.queryByText('Mosque fund')).toBeNull();
    expect(screen.getByText('••••')).toBeTruthy();
    expect(screen.getByLabelText('Hidden')).toBeTruthy();
  });

  it('does not list a paused (inactive) commitment', async () => {
    state.commitments = [friday({ active: false })];
    await render(<GivingScreen />);
    expect(screen.getByText('No Sadaqat set up')).toBeTruthy();
  });
});

describe('commitment form', () => {
  it('saves a weekly commitment: amount in laari, no date or day', async () => {
    await render(<CommitmentScreen />);
    await fireEvent.changeText(screen.getByLabelText('Amount (MVR)'), '25.50');
    await fireEvent.changeText(screen.getByLabelText('Recipient note (optional)'), ' Mosque ');
    await fireEvent.press(screen.getByText('Save'));
    expect(mockSaveCommitment).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'sadaqah', amount_laari: 2550, schedule: 'weekly_friday', due_on: null, day_of_month: null,
        recipient_note: 'Mosque', reminder_enabled: true, active: true,
      }),
      undefined,
    );
    expect(mockBack).toHaveBeenCalled();
  });

  it('needs a day for a monthly commitment and stores it', async () => {
    await render(<CommitmentScreen />);
    await fireEvent.changeText(screen.getByLabelText('Amount (MVR)'), '100');
    await fireEvent.press(screen.getByText('Monthly'));
    await fireEvent.press(screen.getByText('Save'));
    expect(mockSaveCommitment).not.toHaveBeenCalled();
    expect(screen.getByText('Enter a day from 1 to 31.')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Day of month'), '27');
    await fireEvent.press(screen.getByText('Save'));
    expect(mockSaveCommitment).toHaveBeenCalledWith(expect.objectContaining({ schedule: 'monthly', day_of_month: 27, due_on: null }), undefined);
  });

  it('stores a one-off with its date and clears fields that do not apply', async () => {
    await render(<CommitmentScreen />);
    await fireEvent.changeText(screen.getByLabelText('Amount (MVR)'), '100');
    await fireEvent.press(screen.getByText('One time'));
    await fireEvent.press(screen.getByText('Save'));
    expect(mockSaveCommitment).toHaveBeenCalledWith(expect.objectContaining({ schedule: 'once', due_on: today(), day_of_month: null }), undefined);
  });

  it('refuses a missing or zero amount', async () => {
    await render(<CommitmentScreen />);
    await fireEvent.changeText(screen.getByLabelText('Amount (MVR)'), '0');
    await fireEvent.press(screen.getByText('Save'));
    expect(mockSaveCommitment).not.toHaveBeenCalled();
    expect(screen.getByText('Enter a valid amount, like 1,250.00.')).toBeTruthy();
  });
});

describe('marking a commitment done from the transaction sheet', () => {
  it('prefills a giving transaction in Islamic giving, links the commitment and locks the kind', async () => {
    state.categories = [...state.categories, cat('c-give', 'Islamic giving', 'giving')];
    state.commitments = [friday()];
    mockParams = { commitmentId: 'g1' };
    await render(<TransactionScreen />);
    expect(screen.getByLabelText('Amount (MVR)').props.value).toBe('50.00');
    expect(screen.queryByText('Income')).toBeNull();
    await fireEvent.press(screen.getByText('Save'));
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'giving', category_id: 'c-give', amount_laari: 5000, commitment_id: 'g1' }),
      undefined,
    );
  });
});

describe('private mode on other screens', () => {
  const givingTx = gave(today(), { id: 'tx-give', commitment_id: null, note: 'to Aminath' });

  it('masks giving amounts and notes in the transactions list, but not other spending', async () => {
    state.categories = [...state.categories, cat('c-give', 'Islamic giving', 'giving')];
    state.transactions = [
      givingTx,
      { id: 'tx-food', user_id: 'u', account_id: 'a-cash', category_id: 'c-groc', amount_laari: 12500, kind: 'expense',
        occurred_on: today(), note: 'weekly shop', debt_id: null, commitment_id: null, ...stamp },
    ];
    state.privacy = true;
    await render(<TransactionsScreen />);
    expect(screen.queryByText(/to Aminath/)).toBeNull();
    expect(screen.queryByText('-MVR 50.00')).toBeNull();
    expect(screen.getByText(/weekly shop/)).toBeTruthy();
    expect(screen.getByText('-MVR 125.00')).toBeTruthy();
  });

  it('searches the list from the native search bar, and says so when nothing matches', async () => {
    state.transactions = [
      { id: 'tx-food', user_id: 'u', account_id: 'a-cash', category_id: 'c-groc', amount_laari: 12500, kind: 'expense',
        occurred_on: today(), note: 'weekly shop', debt_id: null, commitment_id: null, ...stamp },
      { id: 'tx-pay', user_id: 'u', account_id: 'a-cash', category_id: 'c-sal', amount_laari: 500000, kind: 'income',
        occurred_on: today(), note: 'October pay', debt_id: null, commitment_id: null, ...stamp },
    ];
    await render(<TransactionsScreen />);
    expect(mockSearchBar.current?.placeholder).toBe('Search transactions');
    const type = async (text: string) => {
      const bar = mockSearchBar.current;
      await act(async () => bar?.onChangeText({ nativeEvent: { text } }));
    };
    await type('weekly');
    expect(screen.getByText(/weekly shop/)).toBeTruthy();
    expect(screen.queryByText(/October pay/)).toBeNull();
    await type('submarine');
    expect(screen.getByText('No matches')).toBeTruthy();
    await type('');
    expect(screen.getByText(/October pay/)).toBeTruthy();
  });

  it('shows everything when private mode is off', async () => {
    state.categories = [...state.categories, cat('c-give', 'Islamic giving', 'giving')];
    state.transactions = [givingTx];
    await render(<TransactionsScreen />);
    expect(screen.getByText(/to Aminath/)).toBeTruthy();
    expect(screen.getAllByText('-MVR 50.00')).toHaveLength(2); // the transaction and the day's total
  });

  it('masks the giving figure on Home but leaves income and expenses', async () => {
    state.categories = [...state.categories, cat('c-give', 'Islamic giving', 'giving')];
    state.transactions = [
      givingTx,
      { id: 'tx-in', user_id: 'u', account_id: 'a-cash', category_id: 'c-sal', amount_laari: 500000, kind: 'income',
        occurred_on: today(), note: null, debt_id: null, commitment_id: null, ...stamp },
    ];
    state.privacy = true;
    await render(<HomeScreen />);
    expect(screen.getByText('MVR 5,000.00')).toBeTruthy(); // income still shown
    expect(screen.queryByText('MVR 50.00')).toBeNull(); // giving hidden
    expect(screen.getAllByText('••••').length).toBeGreaterThan(0);
  });
});

describe('settings', () => {
  it('turns private mode on and sets the Hijri adjustment through the profile', async () => {
    await render(<SettingsScreen />);
    await fireEvent(screen.getByLabelText('Private mode'), 'valueChange', true);
    expect(mockUpdateProfile).toHaveBeenCalledWith({ privacy_mode: true });
    await fireEvent.press(screen.getByText('+1 day'));
    expect(mockUpdateProfile).toHaveBeenCalledWith({ hijri_adjustment: 1 });
  });

  it('says how to withdraw consent', async () => {
    await render(<SettingsScreen />);
    expect(screen.getByText(/withdraw your consent at any time by deleting your account/)).toBeTruthy();
  });

  it('links the privacy policy and terms once the legal site is set, and shows no dead rows before', async () => {
    const before = process.env.EXPO_PUBLIC_LEGAL_URL;
    process.env.EXPO_PUBLIC_LEGAL_URL = '';
    const { unmount } = await render(<SettingsScreen />);
    expect(screen.queryByText('Privacy Policy')).toBeNull();
    await unmount();

    process.env.EXPO_PUBLIC_LEGAL_URL = 'https://legal.example/';
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await render(<SettingsScreen />);
    await fireEvent.press(screen.getByText('Privacy Policy'));
    expect(open).toHaveBeenCalledWith('https://legal.example/privacy/');
    await fireEvent.press(screen.getByText('Terms of Service'));
    expect(open).toHaveBeenCalledWith('https://legal.example/terms/');
    open.mockRestore();
    if (before === undefined) delete process.env.EXPO_PUBLIC_LEGAL_URL;
    else process.env.EXPO_PUBLIC_LEGAL_URL = before;
  });
});


const monthEnd = () => {
  const n = new Date();
  const last = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
};
const daysFromToday = (delta: number) => {
  const n = new Date();
  n.setDate(n.getDate() + delta);
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};
const rent = (over: Partial<RecurringItem> = {}): RecurringItem => ({
  id: 'r1', user_id: 'u', name: 'Rent', kind: 'expense', amount_laari: 30000, category_id: 'c-groc', account_id: 'a-bml',
  schedule: 'monthly', day_of_month: 25, weekday: null, next_due_on: monthEnd(), active: true, ...stamp, ...over,
});
const income = (amount: number): Transaction => ({
  id: `in-${amount}`, user_id: 'u', account_id: 'a-cash', category_id: 'c-sal', amount_laari: amount, kind: 'income',
  occurred_on: today(), note: null, debt_id: null, commitment_id: null, ...stamp,
});

describe('home: safe to spend, coming up, debt-free', () => {
  it('sets aside debt minimums, giving and bills, and shows the working', async () => {
    state.transactions = [income(100000)];
    state.debts = [debt({ min_payment_laari: 10000 })];
    state.commitments = [friday({ schedule: 'monthly', day_of_month: 28, amount_laari: 2000 })];
    state.recurring = [rent()];
    await render(<HomeScreen />);
    // 1,000.00 income - 100.00 debt - 20.00 giving - 300.00 bill
    expect(screen.getByText('MVR 580.00')).toBeTruthy();
    expect(screen.getByText('Debt payments')).toBeTruthy();
    expect(screen.getAllByText('Sadaqat')).toHaveLength(2); // this month's total, and what is still set aside
    expect(screen.getByText('Bills')).toBeTruthy();
    expect(screen.getByText(/A guide, not a promise/)).toBeTruthy();
  });

  it('says how much the month is short by when more is due than has come in, and spends nothing', async () => {
    state.transactions = [income(10000)];
    state.recurring = [rent()]; // 300.00 bill against 100.00 of income
    await render(<HomeScreen />);
    expect(screen.getByText('You can safely spend')).toBeTruthy();
    expect(screen.getByText('Short by MVR 200.00 this month')).toBeTruthy();
    // VoiceOver hears one summary: nothing to spend, and by how much the month is short.
    expect(screen.getByLabelText(/^You can safely spend MVR 0\.00\. Short by MVR 200\.00 this month/)).toBeTruthy();
  });

  it('hides the set-aside giving amount in private mode', async () => {
    state.transactions = [income(100000)];
    state.commitments = [friday({ schedule: 'monthly', day_of_month: 28, amount_laari: 2000 })];
    state.privacy = true;
    await render(<HomeScreen />);
    expect(screen.queryByText('MVR 20.00')).toBeNull();
  });

  it('lists what is due soon and opens the right "log it" sheet when tapped', async () => {
    state.recurring = [rent({ next_due_on: daysFromToday(2) })];
    await render(<HomeScreen />);
    await fireEvent.press(screen.getByText(/^Rent ·/));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/transaction', params: { recurringId: 'r1' } });
  });

  it('shows an unlogged bill whose date has passed as waiting, calmly', async () => {
    state.recurring = [rent({ next_due_on: daysFromToday(-3) })];
    await render(<HomeScreen />);
    expect(screen.getByText(/not marked done/)).toBeTruthy();
  });

  it('says nothing is due when nothing is, and shows the debt-free month when there are debts', async () => {
    await render(<HomeScreen />);
    expect(screen.getByText('Nothing due in the next 7 days.')).toBeTruthy();
    expect(screen.queryByText('Debt-free by')).toBeNull();
  });
  it('shows when the debts will be cleared', async () => {
    state.debts = [debt({ balance_laari: 100000, min_payment_laari: 50000 })];
    await render(<HomeScreen />);
    expect(screen.getByText('Debt-free by')).toBeTruthy();
  });
});

describe('bills & income', () => {
  it('invites the user to add the first one', async () => {
    await render(<RecurringScreen />);
    expect(screen.getByText('Nothing set up yet')).toBeTruthy();
    await fireEvent.press(screen.getByText('Add bill or income'));
    expect(mockPush).toHaveBeenCalledWith('/more/recurring-item');
  });
  it('lists items with Log it, and flags a missed date without alarm wording', async () => {
    state.recurring = [rent({ next_due_on: daysFromToday(-2) })];
    await render(<RecurringScreen />);
    expect(screen.getByText('Rent')).toBeTruthy();
    expect(screen.getByText('MVR 300.00')).toBeTruthy();
    await fireEvent.press(screen.getByText('Log it'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/transaction', params: { recurringId: 'r1' } });
  });

  it('saves a monthly bill starting from its next date', async () => {
    state.categories = [...state.categories, cat('c-rent', 'Rent', 'expense')];
    await render(<RecurringItemScreen />);
    await fireEvent.changeText(screen.getByLabelText('Name'), ' Rent ');
    await fireEvent.changeText(screen.getByLabelText('Amount (MVR)'), '7,000');
    await fireEvent.press(screen.getByText('Rent', { exact: true, includeHiddenElements: false }));
    await fireEvent.changeText(screen.getByLabelText('Day of month'), '1');
    await fireEvent.press(screen.getByText('Save'));
    expect(mockSaveRecurring).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Rent', kind: 'expense', amount_laari: 700000, schedule: 'monthly', day_of_month: 1, weekday: null, account_id: 'a-cash', category_id: 'c-rent' }),
      undefined,
    );
    const saved = mockSaveRecurring.mock.calls[0][0] as { next_due_on: string };
    expect(saved.next_due_on.endsWith('-01')).toBe(true);
    expect(saved.next_due_on >= daysFromToday(0).slice(0, 8) + '01').toBe(true);
  });

  it('refuses to save without a name, amount or category', async () => {
    await render(<RecurringItemScreen />);
    await fireEvent.press(screen.getByText('Save'));
    expect(mockSaveRecurring).not.toHaveBeenCalled();
    expect(screen.getByText('Enter a name.')).toBeTruthy();
  });
});

describe('logging a recurring bill from the transaction sheet', () => {
  it('prefills the bill and, once saved, moves it on to its next date', async () => {
    state.recurring = [rent({ next_due_on: '2026-11-25', day_of_month: 25 })];
    mockParams = { recurringId: 'r1' };
    await render(<TransactionScreen />);
    expect(screen.getByLabelText('Amount (MVR)').props.value).toBe('300.00');
    expect(screen.getByLabelText('Note (optional)').props.value).toBe('Rent');
    expect(screen.queryByText('Income')).toBeNull(); // kind is fixed by the bill
    await fireEvent.press(screen.getByText('Save'));
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'expense', category_id: 'c-groc', account_id: 'a-bml', amount_laari: 30000, note: 'Rent' }),
      undefined,
    );
    expect(mockSaveRecurring).toHaveBeenCalledWith(expect.objectContaining({ next_due_on: '2026-12-25' }), expect.objectContaining({ id: 'r1' }));
  });
});

describe('reminders switch', () => {
  const notifications = jest.requireMock('@/features/reminders/notifications');
  it('asks for permission only when turned on, and then stays on', async () => {
    await render(<SettingsScreen />);
    await fireEvent(screen.getByLabelText('Reminders'), 'valueChange', true);
    expect(notifications.requestReminderPermission).toHaveBeenCalledTimes(1);
  });
  it('explains, without turning on, when the phone denies notifications', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    notifications.requestReminderPermission.mockResolvedValueOnce(false);
    await render(<SettingsScreen />);
    await fireEvent(screen.getByLabelText('Reminders'), 'valueChange', true);
    expect(alert).toHaveBeenCalledWith('Notifications are off', expect.stringContaining('Settings'));
    alert.mockRestore();
  });
});


const contact = (over: Partial<TrustedContact> = {}): TrustedContact => ({
  id: 'k1', user_id: 'u', name: 'Cee', inviter_name: 'Aisha', email: 'cee@example.test', phone: null, status: 'invited',
  invite_expires_at: '2026-11-20T00:00:00Z', accepted_at: null, created_at: '2026-11-01T00:00:00Z', ...over,
});

describe('Wasiyyah hub', () => {
  it('is plain about what exists: nothing is released automatically yet, and no rulings are given', async () => {
    await render(<WasiyyahScreen />);
    expect(screen.getByText(/Nothing is released automatically yet/)).toBeTruthy();
    expect(screen.getByText(/gives no rulings or inheritance shares/)).toBeTruthy();
  });

  it('shows the readiness checklist and opens each step', async () => {
    state.debts = [debt()];
    await render(<WasiyyahScreen />);
    expect(screen.getByText(/1 of 3 done/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Invite a trusted contact'));
    expect(mockPush).toHaveBeenCalledWith('/more/contacts');
    await fireEvent.press(screen.getByText('Write a note for your family'));
    expect(mockPush).toHaveBeenCalledWith('/more/wasiyyah-note');
  });
  it('counts a contact and a written note as done, and revoked contacts as not', async () => {
    state.debts = [debt()];
    state.contacts = [contact({ status: 'accepted' }), contact({ id: 'k2', status: 'revoked' })];
    state.note = 'Call my brother';
    await render(<WasiyyahScreen />);
    expect(screen.getByText(/3 of 3 done/)).toBeTruthy();
    expect(screen.getByText('1/3')).toBeTruthy(); // one current contact, the revoked one does not count
  });
  it('does not count a debt that has been paid off', async () => {
    state.debts = [debt({ balance_laari: 100000 })];
    state.transactions = [payment(100000)];
    await render(<WasiyyahScreen />);
    expect(screen.getByText(/0 of 3 done/)).toBeTruthy();
  });
  it('hides the pending-giving amount in private mode', async () => {
    state.commitments = [friday({ amount_laari: 7700 })];
    await render(<WasiyyahScreen />);
    expect(screen.getByText('MVR 77.00')).toBeTruthy();
    state.privacy = true;
    await render(<WasiyyahScreen />);
    expect(screen.getAllByText('••••').length).toBeGreaterThan(0);
  });
});

describe('Wasiyyah note', () => {
  it('shows the stored note and saves an edit', async () => {
    state.note = 'Call Ali first.';
    await render(<WasiyyahNoteScreen />);
    expect(screen.getByLabelText('Note for your family').props.value).toBe('Call Ali first.');
    await fireEvent.changeText(screen.getByLabelText('Note for your family'), 'Call Ali first. Then Hassan.');
    await fireEvent.press(screen.getByText('Save'));
    expect(mockSaveNote).toHaveBeenCalledWith('Call Ali first. Then Hassan.');
    expect(mockBack).toHaveBeenCalled();
  });
  it('never overwrites a stored note when the user did not edit it', async () => {
    state.note = 'Call Ali first.';
    await render(<WasiyyahNoteScreen />);
    await fireEvent.press(screen.getByText('Save'));
    expect(mockSaveNote).not.toHaveBeenCalled();
  });
  it('lets the user clear the note on purpose', async () => {
    state.note = 'Old';
    await render(<WasiyyahNoteScreen />);
    await fireEvent.changeText(screen.getByLabelText('Note for your family'), '');
    await fireEvent.press(screen.getByText('Save'));
    expect(mockSaveNote).toHaveBeenCalledWith('');
  });
});

describe('trusted contacts', () => {
  it('invites the user to add the first one', async () => {
    await render(<ContactsScreen />);
    expect(screen.getByText('No trusted contacts yet')).toBeTruthy();
    await fireEvent.press(screen.getByText('Invite a contact'));
    expect(mockPush).toHaveBeenCalledWith('/more/contact-invite');
  });
  it('lists contacts with their status and removes one only after confirming', async () => {
    const sheet = jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation(() => undefined);
    state.contacts = [contact(), contact({ id: 'k2', name: 'Dee', status: 'accepted' }), contact({ id: 'k3', name: 'Gone', status: 'revoked' })];
    await render(<ContactsScreen />);
    expect(screen.getByText('Cee')).toBeTruthy();
    expect(screen.getByText('Accepted')).toBeTruthy();
    expect(screen.queryByText('Gone')).toBeNull();
    await fireEvent.press(screen.getByText('Cee'));
    expect(mockRevoke).not.toHaveBeenCalled(); // asks first
    // iOS asks with an action sheet: the destructive choice first, Cancel last.
    const [options, choose] = sheet.mock.calls[0];
    expect(options).toMatchObject({ options: ['Remove contact', 'Cancel'], destructiveButtonIndex: 0, cancelButtonIndex: 1 });
    choose(1);
    expect(mockRevoke).not.toHaveBeenCalled(); // cancelling does nothing
    choose(0);
    expect(mockRevoke).toHaveBeenCalledWith('k1');
    sheet.mockRestore();
  });
  it('stops offering invites at three contacts', async () => {
    state.contacts = [contact({ id: 'a' }), contact({ id: 'b', name: 'B' }), contact({ id: 'c', name: 'C' })];
    await render(<ContactsScreen />);
    expect(screen.queryByText('Invite a contact')).toBeNull();
  });
});

describe('invite a trusted contact', () => {
  const fill = async () => {
    await fireEvent.changeText(screen.getByLabelText('Their name'), ' Cee ');
    await fireEvent.changeText(screen.getByLabelText('Their email'), 'cee@example.test');
    await fireEvent.changeText(screen.getByLabelText('Your name on the invite (optional)'), 'Aisha');
  };
  const consentLabel = 'I have their permission to store their name and email in Yusr.';

  it('starts with consent unticked and will not create an invite without it', async () => {
    await render(<ContactInviteScreen />);
    expect(screen.getByLabelText(consentLabel).props.value).toBe(false);
    await fill();
    await fireEvent.press(screen.getByText('Create invite link'));
    expect(mockInvite).not.toHaveBeenCalled();
    expect(screen.getByText('Please confirm you have their permission.')).toBeTruthy();
  });
  it.each([
    ['', 'cee@example.test', 'Enter their name.'],
    ['Cee', 'not-an-email', 'Enter a valid email address.'],
    ['Cee', '', 'Enter a valid email address.'],
  ])('refuses name %j email %j', async (name, email, message) => {
    await render(<ContactInviteScreen />);
    await fireEvent.changeText(screen.getByLabelText('Their name'), name);
    await fireEvent.changeText(screen.getByLabelText('Their email'), email);
    await fireEvent(screen.getByLabelText(consentLabel), 'valueChange', true);
    await fireEvent.press(screen.getByText('Create invite link'));
    expect(mockInvite).not.toHaveBeenCalled();
    expect(screen.getByText(message)).toBeTruthy();
  });
  it('creates the invite and shows a link with the token after "#", shared once', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    await render(<ContactInviteScreen />);
    await fill();
    await fireEvent(screen.getByLabelText(consentLabel), 'valueChange', true);
    await fireEvent.press(screen.getByText('Create invite link'));
    expect(mockInvite).toHaveBeenCalledWith({ name: 'Cee', inviterName: 'Aisha', email: 'cee@example.test', phone: '' });
    expect(await screen.findByText('https://invite.example/accept/#TOKEN-FROM-SERVER')).toBeTruthy();
    expect(screen.getByText(/shows once/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Send the link'));
    expect(share).toHaveBeenCalledWith({ message: expect.stringContaining('Aisha invited you') });
    expect((share.mock.calls[0][0] as { message: string }).message).toContain('https://invite.example/accept/#TOKEN-FROM-SERVER');
    share.mockRestore();
  });
  it.each([
    ['23505', 'That email is already invited.'],
    ['23514', 'Three trusted contacts at most.'],
    [undefined, 'You need to be online to do this.'],
  ])('explains failure code %s in plain words', async (code, message) => {
    mockInvite.mockRejectedValueOnce(Object.assign(new Error('x'), { code }));
    await render(<ContactInviteScreen />);
    await fill();
    await fireEvent(screen.getByLabelText(consentLabel), 'valueChange', true);
    await fireEvent.press(screen.getByText('Create invite link'));
    expect(await screen.findByText(message)).toBeTruthy();
  });
  it('says so, and cannot create a dead link, when the invite page is not set up', async () => {
    process.env.EXPO_PUBLIC_INVITE_URL = '';
    await render(<ContactInviteScreen />);
    expect(screen.getByText('Invite links aren\'t set up in this version yet.')).toBeTruthy();
    await fill();
    await fireEvent(screen.getByLabelText(consentLabel), 'valueChange', true);
    await fireEvent.press(screen.getByText('Create invite link'));
    expect(mockInvite).not.toHaveBeenCalled();
  });
});

describe('share the register', () => {
  const setup = () => {
    state.debts = [debt()];
    state.transactions = [payment(100000)]; // 6,000.00 - 1,000.00 = 5,000.00 still owed
    state.receivables = [{ id: 'r1', user_id: 'u', debtor: 'Hassan', amount_laari: 25000, due_on: null, notes: null, ...stamp }];
    state.commitments = [friday({ type: 'zakat', schedule: 'ramadan', amount_laari: 90000, recipient_note: 'Aminath' })];
    state.secretsList = [['d1', { reference_no: 'ACC-777', notes: 'call Ali first' }]];
    state.note = 'Please call my brother.';
  };

  it('previews exactly what will be sent, including the decrypted reference number', async () => {
    setup();
    await render(<WasiyyahShareScreen />);
    expect(screen.getByText(/BML loan: MVR 5,000.00/)).toBeTruthy();
    expect(screen.getByText(/Reference: ACC-777/)).toBeTruthy();
    expect(screen.getByText(/Contact first: call Ali first/)).toBeTruthy();
    expect(screen.getByText(/Please call my brother\./)).toBeTruthy();
    expect(screen.queryByText(/Aminath/)).toBeNull(); // the private recipient note never leaves
  });
  it('removes a section from the preview when it is switched off', async () => {
    setup();
    await render(<WasiyyahShareScreen />);
    await fireEvent(screen.getByLabelText('Debts'), 'valueChange', false);
    expect(screen.queryByText(/ACC-777/)).toBeNull();
    expect(screen.getByText(/Hassan/)).toBeTruthy();
  });
  it('records the share first, then opens the share sheet with that exact text', async () => {
    setup();
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    await render(<WasiyyahShareScreen />);
    await fireEvent(screen.getByLabelText('Note'), 'valueChange', false);
    await fireEvent.press(screen.getByText('Share'));
    expect(mockLogShared).toHaveBeenCalledWith(['debts', 'receivables', 'giving']);
    expect(mockLogShared.mock.invocationCallOrder[0]).toBeLessThan(share.mock.invocationCallOrder[0]);
    const sent = (share.mock.calls[0][0] as { message: string }).message;
    expect(sent).toContain('ACC-777');
    expect(sent).not.toContain('Please call my brother');
    share.mockRestore();
  });
  it('shares nothing, and says why, if the share cannot be recorded', async () => {
    setup();
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockLogShared.mockRejectedValueOnce(new Error('offline'));
    await render(<WasiyyahShareScreen />);
    await fireEvent.press(screen.getByText('Share'));
    expect(share).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith('Couldn\'t record this share. Connect to the internet and try again.');
    share.mockRestore();
    alert.mockRestore();
  });
  it('cannot be sent with nothing chosen', async () => {
    setup();
    await render(<WasiyyahShareScreen />);
    for (const section of ['Debts', 'Owed to you', 'Pending Sadaqat', 'Note']) await fireEvent(screen.getByLabelText(section), 'valueChange', false);
    expect(screen.getByText('Choose at least one section to share.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Share'));
    expect(mockLogShared).not.toHaveBeenCalled();
  });
});

describe('activity log', () => {
  it('says what happened, naming contacts, and cannot be edited', async () => {
    state.contacts = [contact({ name: 'Cee' })];
    state.audit = [
      { id: 'e1', actor: 'contact', event: 'contact_accepted', meta: { contact_id: 'k1' }, created_at: '2026-11-02T10:30:00Z' },
      { id: 'e2', actor: 'user', event: 'register_shared', meta: { sections: ['debts', 'note'] }, created_at: '2026-11-03T08:05:00Z' },
      { id: 'e3', actor: 'user', event: 'note_changed', meta: {}, created_at: '2026-11-04T09:00:00Z' },
      { id: 'e4', actor: 'contact', event: 'register_viewed', meta: {}, created_at: '2026-11-05T09:00:00Z' },
    ];
    await render(<AuditLogScreen />);
    expect(screen.getByText('Cee accepted')).toBeTruthy();
    expect(screen.getByText('You shared your register (Debts, Note)')).toBeTruthy();
    expect(screen.getByText('You changed your note')).toBeTruthy();
    expect(screen.getByText('A trusted contact viewed your register')).toBeTruthy();
    expect(screen.getByText(/can't be edited/)).toBeTruthy();
  });
  it('shows a calm empty state', async () => {
    await render(<AuditLogScreen />);
    expect(screen.getByText('Nothing yet')).toBeTruthy();
  });
});

describe('new account', () => {
  it('creates the account once even if Save is tapped repeatedly (five "Nanns" accounts)', async () => {
    await render(<AccountScreen />);
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Nanns');
    for (let i = 0; i < 5; i++) await fireEvent.press(screen.getByText('Save'));
    expect(mockSaveAccount).toHaveBeenCalledTimes(1);
    expect(mockSaveAccount).toHaveBeenCalledWith(expect.objectContaining({ name: 'Nanns' }), undefined);
  });

  it('does not create a second account with a name already in use, whatever the case', async () => {
    state.accounts = [cash];
    await render(<AccountScreen />);
    await fireEvent.changeText(screen.getByLabelText('Name'), '  cash ');
    await fireEvent.press(screen.getByText('Save'));
    expect(mockSaveAccount).not.toHaveBeenCalled();
    expect(screen.getByText('You already have an account with this name.')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Savings');
    await fireEvent.press(screen.getByText('Save'));
    expect(mockSaveAccount).toHaveBeenCalledTimes(1); // the correction still saves
  });
});

describe('about', () => {
  it('credits MV Faseyha and its authors as the Thaana Font Gallery lists them, with its licence', async () => {
    await render(<AboutScreen />);
    expect(screen.getByText('MV Faseyha (Dhivehi)')).toBeTruthy();
    expect(screen.getByText('Calligraphy and design by Abdulla Waheed. Management and editing by Hassan Shujau and Hassan Hameed. Digital remapping by Ahmed Niyaz.')).toBeTruthy();
    expect(screen.getByText('Free for personal and commercial use. From the Thaana Font Gallery.')).toBeTruthy();
  });

  it('credits Nunito Sans under its open font licence', async () => {
    await render(<AboutScreen />);
    expect(screen.getByText('Nunito Sans (English)')).toBeTruthy();
    expect(screen.getByText('SIL Open Font License, Version 1.1.')).toBeTruthy();
  });

  it('links to the gallery and its terms', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await render(<AboutScreen />);
    await fireEvent.press(screen.getByText('Thaana Font Gallery'));
    await fireEvent.press(screen.getByText('Gallery terms'));
    expect(open).toHaveBeenCalledWith('https://www.thaanafontgallery.com/font/mv-faseyha');
    expect(open).toHaveBeenCalledWith('https://www.thaanafontgallery.com/terms/');
    open.mockRestore();
  });

  it('is reachable from Settings', async () => {
    await render(<SettingsScreen />);
    await fireEvent.press(screen.getByText('About'));
    expect(mockPush).toHaveBeenCalledWith('/more/about');
  });
});
