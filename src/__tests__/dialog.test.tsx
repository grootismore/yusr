import { act, render } from '@testing-library/react-native';
import { confirmDialog, DialogHost } from '@/lib/dialog';

jest.mock('@expo/vector-icons', () => ({ Ionicons: Object.assign(() => null, { glyphMap: {} }) }));

// A screen shown as a modal sits above the root, so a question has to open from the newest screen's own host.
describe('confirmDialog', () => {
  const ask = (title: string) => confirmDialog({ title, confirmLabel: 'Yes' });

  it('opens from the newest host, and falls back to the older one when that screen closes', async () => {
    const root = await render(<DialogHost />);
    const top = await render(<DialogHost />); // a modal screen on top
    await act(async () => { void ask('First'); });
    expect(top.queryAllByText('First')).toHaveLength(1);
    expect(root.queryAllByText('First')).toHaveLength(0);
    await act(async () => { top.unmount(); });
    await act(async () => { void ask('Second'); });
    expect(root.queryAllByText('Second')).toHaveLength(1);
  });

  it('answers no when nothing can show it', async () => {
    await expect(ask('Nobody home')).resolves.toBe(false);
  });
});
