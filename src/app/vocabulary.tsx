import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../lib/store';
import { WORD_BY_ID, englishOf } from '../lib/vocab';
import { GOALS, STATUSES, STATUS_LABEL, type Status } from '../lib/engine';
import { BelowHeader } from '../components/BelowHeader';
import { SpeakButton } from '../components/WordCard';
import { SwipeToDelete } from '../components/SwipeToDelete';
import { C, STATUS_COLOR } from '../lib/theme';

export default function Vocabulary() {
  const { progress, removeWord } = useStore();
  const [filter, setFilter] = useState<Status | 'all'>('all');

  const rows = useMemo(
    () =>
      [...progress.values()]
        .filter((p) => (filter === 'all' || p.status === filter) && WORD_BY_ID.has(p.wordId))
        .map((p) => ({ p, w: WORD_BY_ID.get(p.wordId)! }))
        .sort((a, b) => a.w.it.localeCompare(b.w.it, 'it')),
    [progress, filter]
  );

  return (
    <BelowHeader>
      <View style={s.filters}>
        {(['all', ...STATUSES] as const).map((f) => {
          const on = filter === f;
          const color = f === 'all' ? C.text : STATUS_COLOR[f];
          return (
            <Pressable key={f} onPress={() => setFilter(f)} style={[s.chip, { borderColor: color }, on && { backgroundColor: color }]}>
              <Text style={[s.chipText, { color: on ? '#fff' : color }]}>{f === 'all' ? 'All' : STATUS_LABEL[f]}</Text>
            </Pressable>
          );
        })}
      </View>
      <FlatList
        data={rows}
        keyExtractor={(r) => String(r.p.wordId)}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={<Text style={s.empty}>No words here yet.</Text>}
        renderItem={({ item: { p, w } }) => (
          <SwipeToDelete onDelete={() => removeWord(p.wordId)}>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.it}>{w.it}</Text>
              <Text style={s.en}>{englishOf(w).join(', ')}</Text>
            </View>
            <Text style={[s.status, { color: STATUS_COLOR[p.status] }]}>
              {STATUS_LABEL[p.status]}
              {p.status !== 'mastered' ? ` ${p.count}/${GOALS[p.status]}` : ''}
            </Text>
            <SpeakButton text={w.it} size={18} />
          </View>
          </SwipeToDelete>
        )}
      />
    </BelowHeader>
  );
}

const s = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingTop: 12 },
  chip: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border },
  it: { fontSize: 17, fontWeight: '600', color: C.text },
  en: { fontSize: 14, color: C.muted, marginTop: 2 },
  status: { fontSize: 13, fontWeight: '600' },
  empty: { textAlign: 'center', color: C.muted, marginTop: 40 },
});
