import { useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { View } from 'react-native';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

  const measure = () =>
    ref.current?.measureInWindow((_x: number, y: number) => {
      const needed = Math.max(headerHeight, insets.top);
      setPad(Math.max(0, Math.round(needed - y)));
    });

  return (
    <View ref={ref} onLayout={measure} style={{ flex: 1, paddingTop: pad }}>
      {children}
    </View>
  );
}
