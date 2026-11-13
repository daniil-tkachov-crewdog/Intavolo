import { Text, View } from 'react-native';
import type { Status } from '../lib/engine';
import { F, useTheme } from '../lib/theme';

/** Soft pill with a coloured dot, e.g. "● New  3/10". */
export function StatusPill({ status, label }: { status: Status; label: string }) {
  const { c } = useTheme();
  const tone = c.status[status];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: tone.soft, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999, alignSelf: 'flex-start' }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tone.fg }} />
      <Text style={{ ...F.semibold, fontSize: 14, color: tone.text }}>{label}</Text>
    </View>
  );
}
