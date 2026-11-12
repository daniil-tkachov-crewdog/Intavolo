import { useRef, type ReactNode } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../lib/theme';

const ACTION_W = 72;

/** Swipe the row left to reveal a delete button on its right side. */
export function SwipeToDelete({ children, onDelete }: { children: ReactNode; onDelete: () => void }) {
  const x = useRef(new Animated.Value(0)).current;
  const base = useRef(0);

  const snap = (to: number) => {
    base.current = to;
    Animated.spring(x, { toValue: to, useNativeDriver: true, bounciness: 0 }).start();
  };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_e, g) => x.setValue(Math.min(0, Math.max(-ACTION_W * 1.4, base.current + g.dx))),
      onPanResponderRelease: (_e, g) => snap(base.current + g.dx < -ACTION_W / 2 || g.vx < -0.5 ? -ACTION_W : 0),
      onPanResponderTerminate: () => snap(base.current),
    })
  ).current;

  const opacity = x.interpolate({ inputRange: [-ACTION_W, -10, 0], outputRange: [1, 0, 0], extrapolate: 'clamp' });

  return (
    <Animated.View style={s.wrap}>
      <Animated.View style={[s.action, { opacity }]}>
        <Pressable
          onPress={() => {
            snap(0);
            onDelete();
          }}
          style={s.btn}
          accessibilityRole="button"
          accessibilityLabel="Delete word"
          hitSlop={8}
        >
          <Ionicons name="trash" size={22} color="#fff" />
        </Pressable>
      </Animated.View>
      <Animated.View style={{ transform: [{ translateX: x }] }} {...pan.panHandlers}>
        <Pressable onPress={() => base.current && snap(0)}>{children}</Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { justifyContent: 'center' },
  action: { position: 'absolute', right: 0, top: 0, bottom: 0, width: ACTION_W, alignItems: 'flex-end', justifyContent: 'center' },
  btn: { width: ACTION_W - 12, top: 0, bottom: 0, position: 'absolute', backgroundColor: C.accent, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
