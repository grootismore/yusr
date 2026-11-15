import { fireEvent, render, screen } from '@testing-library/react-native';
import { CrashScreen } from '@/features/crash/CrashScreen';

const mockSend = jest.fn();
jest.mock('@/lib/monitoring', () => ({ sendFeedback: (...a: unknown[]) => mockSend(...a) }));

describe('problem screen', () => {
  it('lets the person carry on, send a report, and keeps technical text folded away', async () => {
    const onContinue = jest.fn();
    await render(<CrashScreen details="stack text" onContinue={onContinue} />);
    expect(screen.queryByText('stack text')).toBeNull(); // folded
    await fireEvent.press(screen.getByText('Report a problem'));
    expect(mockSend).toHaveBeenCalledWith('', 'stack text');
    expect(screen.getByText('Thank you. We have your report.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Details for support'));
    expect(screen.getByText('stack text')).toBeTruthy();
    await fireEvent.press(screen.getByText('Open Kharadhu'));
    expect(onContinue).toHaveBeenCalled();
  });
});
