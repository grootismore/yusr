import { render, screen } from '@testing-library/react-native';
import { DEPTH, DepthCard } from './DepthCard';

jest.mock('expo-linear-gradient', () => {
  const { View } = jest.requireActual('react-native');
  const React = jest.requireActual('react');
  return { LinearGradient: ({ children, ...props }: { children?: unknown }) => React.createElement(View, props, children) };
});
jest.mock('react-native-svg', () => ({ __esModule: true, default: () => null, Path: () => null }));

const parts = [
  { key: 'spent', label: 'Spent', laari: 270000, color: DEPTH.spent },
  { key: 'bills', label: 'Bills', laari: 30000, color: DEPTH.bills, hidden: true },
  { key: 'safe', label: 'Safe to spend', laari: 340000, color: DEPTH.safe, legend: false },
];

describe('DepthCard', () => {
  it('shows the lead, the headline amount and a legend line for each layer with its real amount', async () => {
    await render(<DepthCard lead="You can safely spend" amount={340000} parts={parts} accessibilityLabel="x" />);
    expect(screen.getByText('You can safely spend')).toBeTruthy();
    expect(screen.getByText('MVR 3,400.00')).toBeTruthy();
    expect(screen.getByText('Spent')).toBeTruthy();
    expect(screen.getByText('MVR 2,700.00')).toBeTruthy();
  });

  it('masks a hidden layer and never prints its amount', async () => {
    await render(<DepthCard lead="l" amount={0} parts={parts} accessibilityLabel="x" />);
    expect(screen.getByText('••••')).toBeTruthy();
    expect(screen.queryByText('MVR 300.00')).toBeNull();
  });

  it('leaves out of the legend a layer the headline already states', async () => {
    await render(<DepthCard lead="l" amount={340000} parts={parts} accessibilityLabel="x" />);
    expect(screen.queryByText('Safe to spend')).toBeNull();
    expect(screen.getAllByText('MVR 3,400.00')).toHaveLength(1);
  });

  it('shows a note line only when given, and no column for a month with nothing in it', async () => {
    await render(<DepthCard lead="l" amount={0} note="Short by MVR 10.00 this month" parts={[]} accessibilityLabel="x" />);
    expect(screen.getByText('Short by MVR 10.00 this month')).toBeTruthy();
    expect(screen.queryByText('Spent')).toBeNull();
  });

  it('is one spoken summary for VoiceOver', async () => {
    await render(<DepthCard lead="l" amount={1} parts={[]} accessibilityLabel="You can safely spend MVR 0.01" />);
    expect(screen.getByLabelText('You can safely spend MVR 0.01')).toBeTruthy();
  });
});
