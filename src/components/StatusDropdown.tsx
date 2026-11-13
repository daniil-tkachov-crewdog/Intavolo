import { Pressable, Text, View } from 'react-native';
import { STATUSES, STATUS_LABEL, type Status } from '../lib/engine';
import { F, makeStyles, useTheme } from '../lib/theme';

export function StatusDropdown({ onPick }: { onPick: (s: Status) => void }) {
  const s = useStyles();
  const { c } = useTheme();
  return (
    <View style={s.box}>
      <Text style={s.title}>How well do you know it?</Text>
      <View style={s.row}>
        {STATUSES.map((st) => (
          <Pressable
            key={st}
            onPress={() => onPick(st)}
            style={({ pressed }) => [s.chip, { backgroundColor: c.status[st].soft }, pressed && { opacity: 0.6 }]}
          >
            <Text style={[s.chipText, { color: c.status[st].text }]}>{STATUS_LABEL[st]}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  box: { backgroundColor: c.card, borderRadius: 22, padding: 14, borderWidth: 1, borderColor: c.border },
  title: { ...F.medium, color: c.muted, fontSize: 14, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 6 },
  chip: { flex: 1, borderRadius: 14, paddingVertical: 11, alignItems: 'center' },
  chipText: { ...F.semibold, fontSize: 13 },
}));
