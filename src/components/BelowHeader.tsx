import { createContext, useContext, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { KeyboardAvoidingView, View, type ViewStyle } from 'react-native';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Window y of the BelowHeader container (= what KeyboardAvoidingView needs as its offset). */
const OffsetCtx = createContext<number | null>(null);

/**
 * Keeps screen content below the navigation bar (and notch).
 * On some iOS versions the bar is drawn over the content; this measures where the
 * screen actually starts and adds only the padding that's missing (0 when nothing overlaps).
 */
export function BelowHeader({ children }: { children: ReactNode }) {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [pad, setPad] = useState(0);
  const [y, setY] = useState<number | null>(null);

  const measure = () =>
    ref.current?.measureInWindow((_x: number, top: number) => {
      const needed = Math.max(headerHeight, insets.top);
      setPad(Math.max(0, Math.round(needed - top)));
      setY(Math.max(0, Math.round(top)));
    });

  return (
    <OffsetCtx.Provider value={y ?? Math.max(headerHeight, insets.top)}>
      <View ref={ref} onLayout={measure} style={{ flex: 1, paddingTop: pad }}>
        {children}
      </View>
    </OffsetCtx.Provider>
  );
}

/**
 * KeyboardAvoidingView for use directly inside <BelowHeader>.
 * Its offset follows the real header height on every device instead of a hard-coded number.
 */
export function KeyboardAvoid({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const offset = useContext(OffsetCtx) ?? 0;
  return (
    <KeyboardAvoidingView behavior="padding" style={[{ flex: 1 }, style]} keyboardVerticalOffset={offset}>
      {children}
    </KeyboardAvoidingView>
  );
}
