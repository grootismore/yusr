import { findPerson, isSettled, nudgeDates, personToSave, remaining, roleOf, statusOf, timeline, totals, type Iou, type IouPayment, type IouPerson } from '@/features/ious/logic';

const iou: Iou = { id: 'i1', user_id: 'me', direction: 'lent', person_name: 'Ahmed', person_email: null, person_account: null, title: 'Rent help', amount_laari: 50_000, lent_on: '2026-11-01', due_on: '2026-12-01', nudge: 'me' };
const pay = (id: string, amount: number, on: string): IouPayment => ({ id, iou_id: 'i1', amount_laari: amount, paid_on: on, note: null, created_by: 'me' });

it('works out what is left and when it is settled', () => {
  expect(remaining(iou, [pay('a', 20_000, '2026-11-10')])).toBe(30_000);
  expect(isSettled(iou, [pay('a', 20_000, '2026-11-10')])).toBe(false);
  expect(remaining(iou, [pay('a', 60_000, '2026-11-10')])).toBe(0); // paying too much just settles it
  expect(isSettled(iou, [pay('a', 50_000, '2026-11-10')])).toBe(true);
});

it('shows the IOU turned round for the other person', () => {
  expect(roleOf(iou, 'me')).toBe('lent');
  expect(roleOf(iou, 'them')).toBe('borrowed');
  expect(roleOf({ ...iou, direction: 'borrowed' }, 'them')).toBe('lent');
});

it('knows when an IOU is overdue, due soon, open or settled', () => {
  expect(statusOf(iou, [], '2026-12-05')).toBe('overdue');
  expect(statusOf(iou, [], '2026-11-28')).toBe('dueSoon');
  expect(statusOf(iou, [], '2026-11-10')).toBe('open');
  expect(statusOf({ ...iou, due_on: null }, [], '2027-01-01')).toBe('open');
  expect(statusOf(iou, [pay('a', 50_000, '2026-11-20')], '2026-12-05')).toBe('settled');
});

it('lays the loan, payments and due date out in order with what is left', () => {
  const t = timeline(iou, [pay('b', 10_000, '2026-12-03'), pay('a', 20_000, '2026-11-10')], '2026-12-02');
  expect(t.map((e) => e.kind)).toEqual(['lent', 'payment', 'due', 'payment']);
  expect(t.map((e) => e.left)).toEqual([50_000, 30_000, 30_000, 20_000]);
  expect(t.map((e) => e.future)).toEqual([false, false, false, true]);
});

it('plans reminders from 2 days before the due date, every 3 days, six in all', () => {
  expect(nudgeDates('2026-12-10', '2026-12-01')).toEqual(['2026-12-08', '2026-12-11', '2026-12-14', '2026-12-17', '2026-12-20', '2026-12-23']);
  expect(nudgeDates('2026-12-10', '2026-12-12')).toEqual(['2026-12-14', '2026-12-17', '2026-12-20', '2026-12-23']);
  expect(nudgeDates(null, '2026-12-01')).toEqual([]);
});

it('adds up what you are owed and what you owe', () => {
  const owed: Iou = { ...iou, id: 'i2', user_id: 'them', direction: 'lent', amount_laari: 10_000 }; // they lent me
  expect(totals([iou, owed], [pay('a', 20_000, '2026-11-10')], 'me')).toEqual({ owedToMe: 30_000, iOwe: 10_000 });
});

describe('saved people', () => {
  const people: IouPerson[] = [{ id: 'p1', name: 'Ahmed', email: null }, { id: 'p2', name: 'Aisha', email: 'aisha@example.mv' }];
  it('finds a person by name without caring about case or spaces', () => {
    expect(findPerson(people, ' ahmed ')?.id).toBe('p1');
    expect(findPerson(people, 'Shiyam')).toBeUndefined();
  });
  it('saves a new person, fills in a missing email, and otherwise leaves the list alone', () => {
    expect(personToSave(people, ' Shiyam ', null)).toEqual({ add: { name: 'Shiyam', email: null } });
    expect(personToSave(people, 'ahmed', 'ahmed@example.mv')).toEqual({ fill: { id: 'p1', email: 'ahmed@example.mv' } });
    expect(personToSave(people, 'Aisha', 'other@example.mv')).toBeNull(); // never overwrites an email already saved
    expect(personToSave(people, 'Ahmed', null)).toBeNull();
    expect(personToSave(people, '  ', null)).toBeNull();
  });
});
