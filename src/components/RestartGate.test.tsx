import { render, screen } from '@testing-library/react-native';
import { initI18n } from '@/lib/i18n';
import { requireRestart } from '@/lib/restartGate';
import { RestartGate } from './RestartGate';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItemSync: jest.fn(() => null), setItemSync: jest.fn() } }));

beforeAll(async () => {
  await initI18n();
});

describe('restart screen after a language change', () => {
  it('shows nothing until a restart is needed, then covers the app in both languages with no way out', async () => {
    await render(<RestartGate />);
    expect(screen.queryByText('Restart to finish')).toBeNull();

    requireRestart();
    expect(await screen.findByText('Restart to finish')).toBeTruthy();
    expect(screen.getByText(/Close and reopen Yusr to apply the new layout\. Swipe up to close Yusr, then open it again\./)).toBeTruthy();
    expect(screen.getByText(/ޔުސްރު ބަންދުކުރުމަށް/)).toBeTruthy(); // the Dhivehi version, so it reads in either direction
    expect(screen.queryByRole('button')).toBeNull(); // nothing to tap: reopening the app is the only way forward
  });
});
