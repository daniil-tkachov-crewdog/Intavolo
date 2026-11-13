import { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useStore } from '../lib/store';
import { WORD_BY_ID } from '../lib/vocab';
import { dueAt, isDue, GOALS, STATUS_LABEL, type Outcome } from '../lib/engine';
import { Exercise } from '../components/Exercise';
import { Button } from '../components/Button';
import { BelowHeader } from '../components/BelowHeader';
import { StatusPill } from '../components/StatusPill';
import { F, makeStyles } from '../lib/theme';

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

export default function VocabTest() {
  return (
    <BelowHeader>
      <Session />
    </BelowHeader>
  );
}

function Session() {
  const s = useStyles();
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
          <Button label="Refresh" variant="secondary" onPress={build} />
        </View>
      </Empty>
    );
  }

  const onAnswered = (o: Outcome) => {
    answer(word.id, o);
    setI((n) => n + 1);
  };

  const goal = p.status === 'mastered' ? null : GOALS[p.status];
  const top = (
    <View style={s.top}>
      <StatusPill status={p.status} label={`${STATUS_LABEL[p.status]}${goal ? `  ${p.count}/${goal}` : '  review'}`} />
      <Text style={s.counter}>
        {i + 1} / {queue.length}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} keyboardVerticalOffset={100}>
      <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
        <Exercise key={`${word.id}-${i}`} word={word} status={p.status} top={top} onAnswered={onAnswered} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Empty({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  const s = useStyles();
  return (
    <View style={s.empty}>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyText}>{text}</Text>
      {children}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 30 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counter: { ...F.regular, fontSize: 14, color: c.muted },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { ...F.bold, fontSize: 22, color: c.text },
  emptyText: { ...F.regular, fontSize: 16, color: c.muted, marginTop: 8, textAlign: 'center' },
}));
