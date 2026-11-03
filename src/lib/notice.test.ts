import { getNotice, hideNotice, showNotice } from './notice';

const current = getNotice;

describe('notice', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    hideNotice();
    jest.useRealTimers();
  });

  it('shows a message and hides it by itself', () => {
    showNotice('Saved');
    expect(current()?.message).toBe('Saved');
    jest.advanceTimersByTime(4001);
    expect(current()).toBeNull();
  });

  it('keeps one with an action (Undo) longer, and a new one replaces the old', () => {
    const undo = jest.fn();
    showNotice('Transaction deleted', { label: 'Undo', onPress: undo });
    jest.advanceTimersByTime(5000);
    expect(current()).toMatchObject({ message: 'Transaction deleted', actionLabel: 'Undo' });
    current()?.onAction?.();
    expect(undo).toHaveBeenCalledTimes(1);
    showNotice('Saved');
    expect(current()?.actionLabel).toBeUndefined();
    jest.advanceTimersByTime(7001);
    expect(current()).toBeNull();
  });
});
