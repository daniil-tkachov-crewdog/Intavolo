import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useStore } from '../lib/store';
import { WORD_BY_ID, englishOf } from '../lib/vocab';
import { GOALS, STATUSES, STATUS_LABEL, type Status } from '../lib/engine';
import { BelowHeader } from '../components/BelowHeader';
import { SpeakButton } from '../components/WordCard';
import { SwipeToDelete } from '../components/SwipeToDelete';
import { F, makeStyles, useTheme } from '../lib/theme';

export default function Vocabulary() {
  const s = useStyles();
  const { c } = useTheme();
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
          const tone = f === 'all' ? { fg: c.primary, soft: c.surface, text: c.text } : c.status[f];
          return (
            <Pressable key={f} onPress={() => setFilter(f)} style={[s.chip, { backgroundColor: on ? tone.fg : tone.soft }]}>
              <Text style={[s.chipText, { color: on ? '#FFFFFF' : tone.text }]}>{f === 'all' ? 'All' : STATUS_LABEL[f]}</Text>
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
              <Text style={[s.status, { color: c.status[p.status].text, backgroundColor: c.status[p.status].soft }]}>
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

const useStyles = makeStyles((c) => ({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingTop: 4 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { ...F.semibold, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.card, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: c.border },
  it: { ...F.semibold, fontSize: 17, color: c.text },
  en: { ...F.regular, fontSize: 14, color: c.muted, marginTop: 2 },
  status: { ...F.semibold, fontSize: 12, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  empty: { ...F.regular, textAlign: 'center', color: c.muted, marginTop: 40 },
}));
