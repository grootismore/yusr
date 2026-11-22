import { act, render, screen, fireEvent } from '@testing-library/react-native';
import { Button } from '@/components/ui';
import { i18n, initI18n } from '@/lib/i18n';

jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true, loadAsync: async () => undefined }));
jest.mock('@/lib/kv', () => {
  const m = new Map<string, string>();
  return { getItem: async (k: string) => m.get(k) ?? null, setItem: async (k: string, v: string) => { m.set(k, v); }, removeItem: async (k: string) => { m.delete(k); } };
});

describe('a button that starts something slow', () => {
  beforeAll(async () => { await initI18n(); await i18n.changeLanguage('en'); });

  it('shows its working label at once, ignores a second tap, and comes back when done', async () => {
    let finish: () => void = () => undefined;
    const onPress = jest.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    await render(<Button label="Delete" busyLabel="Deleting…" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button'));
    expect(screen.getByText('Deleting…')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button')); // a second tap while it works does nothing
    expect(onPress).toHaveBeenCalledTimes(1);
    await act(async () => { finish(); });
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('stays as it was for a plain press', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" busyLabel="Saving…" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Save')).toBeTruthy();
  });
});
