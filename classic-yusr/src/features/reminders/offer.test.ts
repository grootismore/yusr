import { Alert } from 'react-native';
import { offerReminders } from './offer';

const mockStore = new Map<string, string>();
jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: { getItemSync: (k: string) => mockStore.get(k) ?? null, setItemSync: (k: string, v: string) => void mockStore.set(k, v) },
}));
const mockAsk = jest.fn(async () => true);
jest.mock('./notifications', () => ({ requestReminderPermission: () => mockAsk() }));
let mockOn = false;
const mockSet = jest.fn();
jest.mock('./preference', () => ({ remindersEnabledNow: () => mockOn, setRemindersEnabled: (v: boolean) => mockSet(v) }));

const t = ((key: string) => key) as never;

describe('offering reminders', () => {
  beforeEach(() => {
    mockStore.clear();
    mockOn = false;
    jest.clearAllMocks();
  });

  it('asks once, and never asks for the system permission before the person says yes', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    offerReminders(t);
    expect(alert).toHaveBeenCalledTimes(1);
    expect(mockAsk).not.toHaveBeenCalled();
    offerReminders(t); // after "Not now" (or anything) it stays quiet
    expect(alert).toHaveBeenCalledTimes(1);
    alert.mockRestore();
  });

  it('does nothing when reminders are already on', () => {
    mockOn = true;
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    offerReminders(t);
    expect(alert).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  it('turns reminders on only after Remind me and the system permission', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    offerReminders(t);
    const buttons = alert.mock.calls[0][2] as { text: string; onPress?: () => Promise<void> }[];
    await buttons.find((b) => b.text === 'reminders.offerYes')?.onPress?.();
    expect(mockAsk).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith(true);
    alert.mockRestore();
  });
});
