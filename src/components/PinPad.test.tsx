import { fireEvent, render, screen } from '@testing-library/react-native';
import { PinPad } from './PinPad';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('@/lib/haptics', () => ({ selectionHaptic: jest.fn() }));
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItemSync: jest.fn(() => null), setItemSync: jest.fn() } }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('PinPad', () => {
  it('hands over the PIN on the fourth digit, then clears for the next try', async () => {
    const onComplete = jest.fn();
    await render(<PinPad title="Enter your PIN" onComplete={onComplete} />);
    for (const d of ['1', '2', '3']) await fireEvent.press(screen.getByLabelText(d));
    expect(onComplete).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText('4'));
    expect(onComplete).toHaveBeenCalledWith('1234');
  });

  it('ignores presses while disabled (waiting after wrong tries)', async () => {
    const onComplete = jest.fn();
    await render(<PinPad title="t" disabled onComplete={onComplete} />);
    for (const d of ['1', '2', '3', '4']) await fireEvent.press(screen.getByLabelText(d));
    expect(onComplete).not.toHaveBeenCalled();
  });
});
