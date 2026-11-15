import { activePools, isPoolPaid, monthlyTotal, payoutDue, payoutMinor, type MoneyPool, type PoolPayment } from '@/features/pools/logic';

const pool = (o: Partial<MoneyPool> & { id: string }): MoneyPool => ({ name: o.id, note: null, amount_minor: 100_000, currency: 'MVR', due_day: 5, members: null, payout_month: null, payout_received: false, started_on: '2026-01-01', ended_on: null, ...o });

describe('money pools', () => {
  it('only active pools count, and the monthly total values foreign pools in MVR', () => {
    const pools = [pool({ id: 'a' }), pool({ id: 'b', currency: 'USD', amount_minor: 10_000 }), pool({ id: 'c', ended_on: '2026-10-01' })];
    expect(activePools(pools).map((p) => p.id)).toEqual(['a', 'b']);
    expect(monthlyTotal(pools, (minor, c) => (c === 'USD' ? Math.round(minor * 15.42) : minor))).toBe(100_000 + 154_200);
  });
  it('a month is paid once a payment points at that pool and month', () => {
    const pays: PoolPayment[] = [{ id: 'x', pool_id: 'a', expense_id: 'e', period: '2026-11-01' }];
    expect(isPoolPaid(pool({ id: 'a' }), pays, '2026-11-01')).toBe(true);
    expect(isPoolPaid(pool({ id: 'a' }), pays, '2026-12-01')).toBe(false);
    expect(isPoolPaid(pool({ id: 'b' }), pays, '2026-11-01')).toBe(false);
  });
  it('the pot is every member\'s contribution, and is due to record in your month or later until recorded', () => {
    const p = pool({ id: 'a', members: 10, payout_month: '2026-11-01' });
    expect(payoutMinor(p)).toBe(1_000_000);
    expect(payoutMinor(pool({ id: 'b' }))).toBeNull();
    expect(payoutDue(p, '2026-10-01')).toBe(false);
    expect(payoutDue(p, '2026-11-01')).toBe(true);
    expect(payoutDue({ ...p, payout_received: true }, '2026-11-01')).toBe(false);
  });
});
