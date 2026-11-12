import { render } from '@testing-library/react-native';
import { AppIcon, SF_SYMBOLS } from './AppIcon';

const mockSymbol = jest.fn((_props: Record<string, unknown>) => null);
const mockIonicon = jest.fn((_props: Record<string, unknown>) => null);
jest.mock('expo-symbols', () => ({ SymbolView: (props: Record<string, unknown>) => mockSymbol(props) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: (props: Record<string, unknown>) => mockIonicon(props) }));

describe('AppIcon', () => {
  beforeEach(() => jest.clearAllMocks());

  it('draws the SF Symbol for a known icon, with the Ionicons glyph as the fallback', async () => {
    await render(<AppIcon name="add" size={26} color="#123456" accessible={false} />);
    expect(mockSymbol).toHaveBeenCalledWith(expect.objectContaining({ name: 'plus', size: 26, tintColor: '#123456', accessible: false }));
    const fallback = mockSymbol.mock.calls[0][0].fallback as { props: Record<string, unknown> };
    expect(fallback.props).toMatchObject({ name: 'add', size: 26, color: '#123456' });
  });

  it('falls back to Ionicons for an icon without an SF Symbol', async () => {
    await render(<AppIcon name="airplane" size={20} color="#000000" />);
    expect(mockSymbol).not.toHaveBeenCalled();
    expect(mockIonicon).toHaveBeenCalledWith(expect.objectContaining({ name: 'airplane', size: 20 }));
  });

  it('has an SF Symbol for every icon the app draws', () => {
    for (const name of ['add', 'checkmark', 'checkmark-circle', 'ellipse-outline', 'chevron-back', 'chevron-forward', 'swap-horizontal-outline', 'heart-outline', 'calendar-outline', 'time-outline', 'people-outline', 'receipt-outline', 'wallet-outline'] as const) {
      expect(SF_SYMBOLS[name]).toBeTruthy();
    }
  });
});
