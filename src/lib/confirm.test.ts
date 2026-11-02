import { ActionSheetIOS, Alert, Platform } from 'react-native';
import { confirmAction } from './confirm';

jest.mock('./haptics', () => ({ warningHaptic: jest.fn() }));

const options = (over: Partial<Parameters<typeof confirmAction>[0]> = {}) => ({
  title: 'Delete?',
  message: 'This cannot be undone.',
  confirmLabel: 'Delete',
  cancelLabel: 'Cancel',
  onConfirm: jest.fn(),
  ...over,
});

describe('confirmAction', () => {
  const original = Platform.OS;
  afterEach(() => {
    Platform.OS = original;
    jest.restoreAllMocks();
  });

  it('asks with an action sheet on iOS: destructive first, Cancel last, and acts only on the first', () => {
    Platform.OS = 'ios';
    const sheet = jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation(() => undefined);
    const o = options();
    confirmAction(o);
    const [config, pick] = sheet.mock.calls[0];
    expect(config).toMatchObject({ options: ['Delete', 'Cancel'], destructiveButtonIndex: 0, cancelButtonIndex: 1 });
    pick(1);
    expect(o.onConfirm).not.toHaveBeenCalled();
    pick(0);
    expect(o.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('does not mark a harmless choice as destructive', () => {
    Platform.OS = 'ios';
    const sheet = jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation(() => undefined);
    confirmAction(options({ destructive: false }));
    expect(sheet.mock.calls[0][0].destructiveButtonIndex).toBeUndefined();
  });

  it('uses a standard alert elsewhere', () => {
    Platform.OS = 'android';
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const o = options();
    confirmAction(o);
    const buttons = alert.mock.calls[0][2] as { text: string; style?: string; onPress?: () => void }[];
    expect(buttons.map((b) => b.text)).toEqual(['Cancel', 'Delete']);
    expect(buttons[1].style).toBe('destructive');
    buttons[1].onPress?.();
    expect(o.onConfirm).toHaveBeenCalledTimes(1);
  });
});
