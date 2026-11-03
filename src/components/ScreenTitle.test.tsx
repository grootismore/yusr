import { I18nManager } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { Screen } from './ui';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItemSync: jest.fn(() => null), setItemSync: jest.fn() } }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('the page title the app draws itself', () => {
  it('is left to the native large title in a left-to-right layout', async () => {
    await render(<Screen title="Home">{null}</Screen>);
    expect(screen.queryByText('Home')).toBeNull();
  });

  it('is drawn as a header in a right-to-left layout, where the native one is switched off', async () => {
    const restore = jest.replaceProperty(I18nManager, 'isRTL', true);
    await render(<Screen title="ގެ">{null}</Screen>);
    expect(screen.getByRole('header', { name: 'ގެ' })).toBeTruthy();
    restore.restore();
  });
});
