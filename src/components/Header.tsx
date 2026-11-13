import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { F, makeStyles, useTheme } from '../lib/theme';

/** Large left-aligned title used on the tab screens. */
export function TabHeader({ title, right }: { title: string; right?: ReactNode }) {
  const s = useStyles();
  const { top } = useSafeAreaInsets();
  return (
    <View style={[s.tab, { paddingTop: top + 8 }]}>
      <Text style={s.tabTitle}>{title}</Text>
      {right}
    </View>
  );
}

/** Round back button + title used on pushed screens. */
export function StackHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  const s = useStyles();
  const { c } = useTheme();
  const { top } = useSafeAreaInsets();
  return (
    <View style={[s.stack, { paddingTop: top + 6 }]}>
      {onBack && (
        <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back" style={({ pressed }) => [s.round, pressed && { opacity: 0.6 }]}>
          <Ionicons name="chevron-back" size={20} color={c.text} />
        </Pressable>
      )}
      <Text style={[s.stackTitle, title.length > 14 && { fontSize: 22 }]} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

/** Round icon button for header actions. */
export function HeaderButton({ icon, onPress, label }: { icon: keyof typeof Ionicons.glyphMap; onPress?: () => void; label: string }) {
  const s = useStyles();
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [s.round, s.roundBig, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icon} size={21} color={c.primary} />
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  tab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14, backgroundColor: c.bg },
  tabTitle: { ...F.bold, fontSize: 32, letterSpacing: -0.64, color: c.text },
  stack: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: c.bg },
  stackTitle: { ...F.bold, flex: 1, fontSize: 28, letterSpacing: -0.5, color: c.text },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  roundBig: { width: 42, height: 42, borderRadius: 21 },
}));
