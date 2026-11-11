import { Pressable, StyleSheet, Text, View } from 'react-native';
import { STATUSES, STATUS_LABEL, type Status } from '../lib/engine';
import { C, STATUS_COLOR } from '../lib/theme';

export function StatusDropdown({ onPick }: { onPick: (s: Status) => void }) {
  return (
    <View style={s.box}>
      <Text style={s.title}>How well do you know it?</Text>
      <View style={s.row}>
        {STATUSES.map((st) => (
          <Pressable
            key={st}
            onPress={() => onPick(st)}
            style={({ pressed }) => [s.chip, { borderColor: STATUS_COLOR[st] }, pressed && { backgroundColor: STATUS_COLOR[st] + '22' }]}
          >
            <Text style={[s.chipText, { color: STATUS_COLOR[st] }]}>{STATUS_LABEL[st]}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  box: { backgroundColor: C.card, borderRadius: 16, padding: 14, marginTop: 10, borderWidth: 1, borderColor: C.border },
  title: { color: C.muted, fontSize: 14, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  chipText: { fontWeight: '600', fontSize: 13 },
});
