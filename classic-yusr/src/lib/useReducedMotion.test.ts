import { AccessibilityInfo } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { useReducedMotion } from './useReducedMotion';

describe('useReducedMotion', () => {
  it('follows the phone setting, including when it changes', async () => {
    let notify: (value: boolean) => void = () => undefined;
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const remove = jest.fn();
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((_name: string, handler: (value: boolean) => void) => {
      notify = handler;
      return { remove };
    }) as never);
    const { result, unmount } = await renderHook(() => useReducedMotion());
    await act(async () => undefined); // let the first answer arrive
    expect(result.current).toBe(true);
    await act(async () => notify(false));
    expect(result.current).toBe(false);
    await unmount();
    expect(remove).toHaveBeenCalled();
  });
});
