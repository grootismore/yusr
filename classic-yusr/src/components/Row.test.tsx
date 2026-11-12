import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { Row } from './ui';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItemSync: jest.fn(() => null), setItemSync: jest.fn() } }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const style = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style);

describe('Row layout', () => {
  it('keeps the label whole next to a long value, and lets the value wrap', async () => {
    await render(<Row label="Monthly" value="Due 1 November 2026, not marked done" />);
    expect(style('Monthly')).toMatchObject({ flexShrink: 0, maxWidth: '50%' }); // never one letter per line
    expect(style('Due 1 November 2026, not marked done')).toMatchObject({ flexShrink: 1 });
  });

  it('lets a lone label fill the row and wrap', async () => {
    await render(<Row label="Edit Sadaqat" />);
    expect(style('Edit Sadaqat')).toMatchObject({ flexGrow: 1, flexShrink: 1 });
  });
});
