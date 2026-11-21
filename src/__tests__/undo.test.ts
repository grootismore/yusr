import { removeWithUndo } from '@/lib/undo';
import { toast } from '@/lib/toast';

jest.mock('@/lib/toast', () => ({ toast: jest.fn() }));
const mockToast = toast as jest.MockedFunction<typeof toast>;

const text = { text: 'Deleted', undo: 'Undo', restored: 'Put back', failed: 'Could not put it back' };

beforeEach(() => mockToast.mockClear());

it('removes at once and offers an undo that puts it back', async () => {
  const calls: string[] = [];
  await removeWithUndo({ ...text, remove: async () => { calls.push('remove'); }, restore: async () => { calls.push('restore'); } });
  expect(calls).toEqual(['remove']); // nothing is asked first, and nothing is restored yet
  expect(mockToast).toHaveBeenCalledWith('Deleted', 'ok', expect.objectContaining({ label: 'Undo' }));
  const action = mockToast.mock.calls[0][2]!;
  action.onPress();
  await new Promise((r) => setTimeout(r, 0));
  expect(calls).toEqual(['remove', 'restore']);
  expect(mockToast).toHaveBeenLastCalledWith('Put back');
});

it('says so when the undo itself fails', async () => {
  await removeWithUndo({ ...text, remove: async () => undefined, restore: async () => { throw new Error('offline'); } });
  mockToast.mock.calls[0][2]!.onPress();
  await new Promise((r) => setTimeout(r, 0));
  expect(mockToast).toHaveBeenLastCalledWith('Could not put it back', 'error');
});

it('does not offer an undo when the removal failed', async () => {
  await expect(removeWithUndo({ ...text, remove: async () => { throw new Error('nope'); }, restore: async () => undefined })).rejects.toThrow('nope');
  expect(mockToast).not.toHaveBeenCalled();
});
