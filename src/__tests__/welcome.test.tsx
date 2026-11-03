import { fireEvent, render, screen } from '@testing-library/react-native';
import { i18n, initI18n } from '@/lib/i18n';
import WelcomeScreen from '../../app/(auth)/welcome';

const mockFinish = jest.fn();
const mockSetLanguage = jest.fn(async (_language: string) => false);

jest.mock('expo-router', () => ({ Stack: { Screen: () => null } }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItemSync: jest.fn(() => null), setItemSync: jest.fn() } }));
jest.mock('@/features/onboarding/state', () => ({ finishOnboarding: () => mockFinish(), useOnboarded: () => false }));
jest.mock('@/lib/i18n', () => ({ ...jest.requireActual('@/lib/i18n'), setLanguage: (language: string) => mockSetLanguage(language) }));

beforeAll(async () => {
  await initI18n();
});
beforeEach(() => {
  jest.clearAllMocks();
  i18n.changeLanguage('en');
});

describe('welcome flow', () => {
  it('walks four short screens and ends with Get started, with no way to get stuck', async () => {
    await render(<WelcomeScreen />);
    expect(screen.getByText('Welcome to Yusr')).toBeTruthy();
    await fireEvent.press(screen.getByText('Next'));
    expect(screen.getByText('Choose your language')).toBeTruthy();
    await fireEvent.press(screen.getByText('Next'));
    expect(screen.getByText('Your data stays yours')).toBeTruthy();
    expect(screen.getByText('For adults, 18 and older.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Next'));
    expect(screen.getByText('Ready when you are')).toBeTruthy();
    expect(screen.queryByText('Skip')).toBeNull(); // nothing left to skip
    expect(mockFinish).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText('Get started'));
    expect(mockFinish).toHaveBeenCalledTimes(1);
  });

  it('can be skipped from the first screen', async () => {
    await render(<WelcomeScreen />);
    await fireEvent.press(screen.getByText('Skip'));
    expect(mockFinish).toHaveBeenCalledTimes(1);
  });

  it('switches language from the second screen', async () => {
    await render(<WelcomeScreen />);
    await fireEvent.press(screen.getByText('Next'));
    expect(screen.getByText('You can change it later in Settings.')).toBeTruthy();
    await fireEvent.press(screen.getByText('ދިވެހި'));
    expect(mockSetLanguage).toHaveBeenCalledWith('dv'); // a layout change then covers the app with the restart screen
  });
});
