import { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useStore } from '../../lib/store';
import { WORD_BY_ID } from '../../lib/vocab';
import { dueAt, isDue, GOALS, STATUS_LABEL, type Outcome } from '../../lib/engine';
import { Exercise } from '../../components/Exercise';
import { Button } from '../../components/Button';
import { C, STATUS_COLOR } from '../../lib/theme';

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

export default function Practice() {
  const { progress, answer } = useStore();
  const [queue, setQueue] = useState<number[]>([]);
  const [i, setI] = useState(0);
  const latest = useRef(progress);
  latest.current = progress;

  // Rebuild the queue when the tab gains focus (or on Refresh), not after every answer.
  const build = useCallback(() => {
    const now = Date.now();
    setQueue(shuffle([...latest.current.values()].filter((p) => isDue(p, now) && WORD_BY_ID.has(p.wordId)).map((p) => p.wordId)));
    setI(0);
  }, []);
  useFocusEffect(build);

  const wordId = queue[i];
  const p = wordId !== undefined ? progress.get(wordId) : undefined;
  const word = wordId !== undefined ? WORD_BY_ID.get(wordId) : undefined;

  if (!progress.size) {
    return <Empty title="No words yet" text="Tap Learn or Already Know in Explore to add words." />;
  }

  if (!p || !word) {
    const nextAt = Math.min(...[...progress.values()].map(dueAt));
    const mins = Math.max(1, Math.ceil((nextAt - Date.now()) / 60000));
    return (
      <Empty
        title="All done for now ✅"
        text={`Next word is ready in ${mins >= 60 * 24 ? Math.round(mins / 1440) + ' d' : mins >= 60 ? Math.round(mins / 60) + ' h' : mins + ' min'}.`}
      >
        <View style={{ flexDirection: 'row', marginTop: 20, width: 180 }}>
          <Button label="Refresh" outline onPress={build} />
        </View>
      </Empty>
    );
  }

  const onAnswered = (o: Outcome) => {
    answer(word.id, o);
    setI((n) => n + 1);
  };

  const goal = p.status === 'mastered' ? null : GOALS[p.status];

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} keyboardVerticalOffset={100}>
      <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
        <View style={s.top}>
          <Text style={[s.badge, { color: STATUS_COLOR[p.status], borderColor: STATUS_COLOR[p.status] }]}>
            {STATUS_LABEL[p.status]}
            {goal ? `  ${p.count}/${goal}` : '  review'}
          </Text>
          <Text style={s.counter}>
            {i + 1} / {queue.length}
          </Text>
        </View>
        <Exercise key={`${word.id}-${i}`} word={word} status={p.status} onAnswered={onAnswered} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Empty({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyText}>{text}</Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badge: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, fontWeight: '600', overflow: 'hidden' },
  counter: { color: C.muted },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: C.text },
  emptyText: { fontSize: 16, color: C.muted, marginTop: 8, textAlign: 'center' },
});
