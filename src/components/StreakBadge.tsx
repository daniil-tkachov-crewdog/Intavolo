import { Pressable } from 'react-native';
import { SCALE, Text } from './Text';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useActivity } from '../lib/activity';
import { F, makeStyles, useTheme } from '../lib/theme';

/** Flame + streak count in tab headers. Lit once today's goal is done. */
export function StreakBadge() {
  const s = useStyles();
  const { c } = useTheme();
  const { info } = useActivity();
  const lit = info.todayDone;
  const color = lit ? c.accent.amber.fg : c.muted;
  return (
    <Pressable
      onPress={() => router.push('/streak')}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`${info.current} day streak`}
      style={({ pressed }) => [s.pill, lit && { backgroundColor: c.accent.amber.soft, borderColor: c.accent.amber.soft }, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={lit ? 'flame' : 'flame-outline'} size={19} color={color} />
      <Text maxFontSizeMultiplier={SCALE.ui} style={[s.num, { color: lit ? c.accent.amber.text : c.muted }]}>{info.current}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 42, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 21, backgroundColor: c.card, borderWidth: 1, borderColor: c.border },
  num: { ...F.bold, fontSize: 16 },
}));
