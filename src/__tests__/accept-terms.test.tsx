import { fireEvent, render, screen } from '@testing-library/react-native';
import { i18n, initI18n } from '@/lib/i18n';
import AcceptTermsScreen from '../../app/accept-terms';

const mockPush = jest.fn();
const mockSignOut = jest.fn();
const mockMutate = jest.fn();
let mockNeeded: string[] = ['terms', 'privacy'];

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  Stack: { Screen: () => null },
}));
jest.mock('@/lib/auth/AuthProvider', () => ({ useAuth: () => ({ signOut: mockSignOut }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItemSync: jest.fn(() => null), setItemSync: jest.fn() } }));
jest.mock('@/features/account/hooks', () => ({
  useConsentGate: () => ({ checking: false, needed: mockNeeded }),
  useRecordConsents: () => ({ mutate: mockMutate, isPending: false }),
}));

beforeAll(async () => {
  await initI18n();
});
beforeEach(() => {
  mockNeeded = ['terms', 'privacy'];
  jest.clearAllMocks();
  i18n.changeLanguage('en');
});

describe('accepting updated terms', () => {
  it('starts unticked and cannot continue until every document is accepted', async () => {
    await render(<AcceptTermsScreen />);
    const accept = screen.getByRole('button', { name: 'Accept and continue' });
    expect(accept.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(accept);
    expect(mockMutate).not.toHaveBeenCalled();

    await fireEvent(screen.getByLabelText('I accept the Terms of Service'), 'valueChange', true);
    expect(screen.getByRole('button', { name: 'Accept and continue' }).props.accessibilityState.disabled).toBe(true); // privacy still unticked
    await fireEvent(screen.getByLabelText('I accept the Privacy Policy'), 'valueChange', true);
    await fireEvent.press(screen.getByRole('button', { name: 'Accept and continue' }));
    expect(mockMutate).toHaveBeenCalledWith(['terms', 'privacy'], expect.anything());
  });

  it('asks only for what is missing, and offers sign out and delete instead of accepting', async () => {
    mockNeeded = ['privacy'];
    await render(<AcceptTermsScreen />);
    expect(screen.queryByLabelText('I accept the Terms of Service')).toBeNull();
    expect(screen.getByLabelText('I accept the Privacy Policy')).toBeTruthy();
    await fireEvent.press(screen.getByText('Sign out'));
    expect(mockSignOut).toHaveBeenCalled();
    await fireEvent.press(screen.getByText('Delete account'));
    expect(mockPush).toHaveBeenCalledWith('/delete-account');
  });
});
