import { ACTION_WIDTH, swipeOutcome } from './SwipeToDelete';

describe('swipeOutcome', () => {
  const width = 390;
  it('opens past half the button, and snaps shut before that', () => {
    expect(swipeOutcome(ACTION_WIDTH, 0, width)).toBe('open');
    expect(swipeOutcome(ACTION_WIDTH / 2 + 1, 0, width)).toBe('open');
    expect(swipeOutcome(ACTION_WIDTH / 2 - 1, 0, width)).toBe('close');
  });
  it('a quick flick decides the direction', () => {
    expect(swipeOutcome(20, 1.2, width)).toBe('open');
    expect(swipeOutcome(ACTION_WIDTH, -1.2, width)).toBe('close');
  });
  it('a long pull, or a flick from far along, goes on to delete (the caller still asks first)', () => {
    expect(swipeOutcome(width * 0.7, 0, width)).toBe('delete');
    expect(swipeOutcome(width * 0.5, 1.5, width)).toBe('delete');
  });
});
