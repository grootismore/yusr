import { useEffect, useState, type ReactNode } from 'react';
import { Animated, I18nManager, PanResponder, Pressable, View, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { useColors } from '@/lib/theme';

export const ACTION_WIDTH = 88;

/**
 * Where a swipe ends. `pos` is how far the row is open (0 closed, ACTION_WIDTH showing the button,
 * more means it was pulled further), `velocity` is toward open (positive) or closed (negative).
 * A long pull, or a quick flick from an already-open row, deletes (the caller still asks first).
 */
export function swipeOutcome(pos: number, velocity: number, rowWidth: number): 'delete' | 'open' | 'close' {
  if (pos > rowWidth * 0.6) return 'delete';
  if (velocity > 0.6) return pos > rowWidth * 0.4 ? 'delete' : 'open';
  if (velocity < -0.6) return 'close';
  return pos > ACTION_WIDTH / 2 ? 'open' : 'close';
}

// Only one row stays open at a time.
let closeOpenRow: (() => void) | null = null;

/** What the gesture needs to remember between touches. A class, so React's rules about plain objects do not apply. */
class Live {
  width = 0;
  start = 0;
  open = false;
  onDelete: () => void;
  constructor(onDelete: () => void) {
    this.onDelete = onDelete;
  }
  update(width: number, onDelete: () => void) {
    this.width = width;
    this.onDelete = onDelete;
  }
  setOpen(open: boolean) {
    this.open = open;
  }
  setStart(value: number) {
    this.start = value;
  }
}

/** The gesture itself, kept outside the component: it reads and writes `live` only when a touch happens. */
function makePan({ live, x, rtl, setOpen }: { live: Live; x: Animated.Value; rtl: boolean; setOpen: (open: boolean) => void }) {
  const settle = (to: number) => {
    Animated.timing(x, { toValue: to, duration: 180, useNativeDriver: true }).start();
    live.setOpen(to > 0);
    setOpen(to > 0);
    if (to > 0) {
      if (closeOpenRow && closeOpenRow !== close) closeOpenRow();
      closeOpenRow = close;
    } else if (closeOpenRow === close) closeOpenRow = null;
  };
  function close() {
    settle(0);
  }
  return PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      x.stopAnimation((v) => {
        live.setStart(v);
      });
    },
    onPanResponderMove: (_e, g) => {
      const toward = rtl ? g.dx : -g.dx; // toward the trailing edge, in screen terms
      x.setValue(Math.min(Math.max(live.start + toward, 0), live.width || 400));
    },
    onPanResponderRelease: (_e, g) => {
      const toward = rtl ? g.dx : -g.dx;
      const pos = Math.min(Math.max(live.start + toward, 0), live.width || 400);
      const outcome = swipeOutcome(pos, rtl ? g.vx : -g.vx, live.width || 400);
      if (outcome === 'delete') {
        settle(0);
        live.onDelete();
      } else settle(outcome === 'open' ? ACTION_WIDTH : 0);
    },
  });
}

/**
 * Swipe a row toward its trailing edge (left in English, right in Dhivehi) to show a Delete button.
 * Tapping it, or pulling all the way, calls `onDelete` (which should ask first). Screen-reader users
 * get the same through a "delete" accessibility action that the caller puts on the row.
 */
export function SwipeToDelete({ children, label, onDelete, style }: { children: ReactNode; label: string; onDelete: () => void; style?: ViewStyle }) {
  const colors = useColors();
  const rtl = I18nManager.isRTL;
  const [x] = useState(() => new Animated.Value(0));
  const [width, setWidth] = useState(0);
  const [open, setOpen] = useState(false);
  // Read by the gesture when a touch happens; refreshed after each render.
  const [live] = useState(() => new Live(onDelete));
  useEffect(() => {
    live.update(width, onDelete);
  });

  const [pan] = useState(() => makePan({ live, x, rtl, setOpen }));

  const translateX = rtl ? x : Animated.multiply(x, -1);
  return (
    <View style={{ overflow: 'hidden', ...style }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View
        style={{ position: 'absolute', top: 0, bottom: 0, end: 0, width: ACTION_WIDTH, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }}
      >
        <Pressable accessible={false} importantForAccessibility="no" onPress={() => { live.onDelete(); }} style={{ flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.background }}>{label}</Text>
        </Pressable>
      </View>
      <Animated.View style={{ transform: [{ translateX }] }} {...pan.panHandlers}>
        {children}
        {open ? (
          // A tap on an open row closes it instead of opening it.
          <Pressable
            accessible={false}
            onPress={() => {
              Animated.timing(x, { toValue: 0, duration: 180, useNativeDriver: true }).start();
              setOpen(false);
              live.setOpen(false);
            }}
            style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0 }}
          />
        ) : null}
      </Animated.View>
    </View>
  );
}
