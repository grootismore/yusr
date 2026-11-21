import { toast } from './toast';

/**
 * Remove something at once and offer a way back instead of asking first: people tap through "Are you sure?", and a wrong
 * delete is only really fixed by undo. `restore` puts back what `remove` took away. The offer lasts about six seconds.
 */
export async function removeWithUndo(a: { remove: () => Promise<unknown>; restore: () => Promise<unknown>; text: string; undo: string; restored: string; failed: string }): Promise<void> {
  await a.remove();
  toast(a.text, 'ok', { label: a.undo, onPress: () => { void a.restore().then(() => toast(a.restored), () => toast(a.failed, 'error')); } });
}
