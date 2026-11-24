import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SCALE, Text } from '../components/Text';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../lib/store';
import { useActivity } from '../lib/activity';
import { LEVEL_COUNTS, SESSION, atLevel, fromMyWords, pickSession, type Sentence, type Source } from '../lib/sentences';
import { tiles } from '../lib/translate';
import { BelowHeader, KeyboardAvoid } from '../components/BelowHeader';
import { Button } from '../components/Button';
import { SentenceExercise, type Kind } from '../components/SentenceExercise';
import { F, makeStyles, useTheme } from '../lib/theme';

type Round = { items: { sentence: Sentence; kind: Kind }[]; key: number };

export default function Sentences() {
  const { progress } = useStore();
  const mine = useMemo(() => fromMyWords(progress), [progress]);
  const [source, setSource] = useState<Source>(mine.length >= SESSION ? 'mine' : 'A1');
  const [round, setRound] = useState<Round | null>(null);
  const [score, setScore] = useState<number | null>(null);

  const start = () => {
    const items = pickSession(source === 'mine' ? mine : atLevel(source)).map((sentence) => {
      // Word bank only when the shortest translation is short enough to tap together.
      const shortest = [...sentence.en].sort((a, b) => a.length - b.length)[0];
      const kind: Kind = tiles(shortest).length <= 10 && Math.random() < 0.5 ? 'tiles' : 'type';
      return { sentence, kind };
    });
    setScore(null);
    setRound({ items, key: Date.now() });
  };

  return (
    <BelowHeader>
      {score !== null && round ? (
        <Result score={score} total={round.items.length} onAgain={start} onSetup={() => setRound(null)} />
      ) : round ? (
        <Session key={round.key} round={round} onDone={setScore} />
      ) : (
        <Setup source={source} setSource={setSource} mineCount={mine.length} onStart={start} />
      )}
    </BelowHeader>
  );
}

function Setup({ source, setSource, mineCount, onStart }: { source: Source; setSource: (s: Source) => void; mineCount: number; onStart: () => void }) {
  const s = useStyles();
  const { c } = useTheme();
  const options: { key: Source; title: string; sub: string; count: number }[] = [
    { key: 'mine', title: 'My words', sub: 'Only words you have added', count: mineCount },
    ...LEVEL_COUNTS.map((l) => ({ key: l.name as Source, title: l.name, sub: 'All sentences at this level', count: l.count })),
  ];
  const count = options.find((o) => o.key === source)?.count ?? 0;
  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Text style={s.intro}>Translate real Italian sentences written by native speakers. {SESSION} sentences per round.</Text>
      {options.map((o) => {
        const on = o.key === source;
        return (
          <Pressable
            key={o.key}
            disabled={!o.count}
            onPress={() => setSource(o.key)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on, disabled: !o.count }}
            style={[s.option, on && { borderColor: c.primary, backgroundColor: c.accent.purple.soft }, !o.count && { opacity: 0.5 }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{o.title}</Text>
              <Text style={s.sub}>{o.key === 'mine' && !o.count ? 'Add words in Explore first' : o.sub}</Text>
            </View>
            <Text style={s.count}>{o.count.toLocaleString('en-US')}</Text>
            <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? c.primary : c.muted} />
          </Pressable>
        );
      })}
      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        <Button label="Start" iconRight="arrow-forward" disabled={!count} onPress={onStart} />
      </View>
      <Text style={s.credit}>Sentences and translations: Tatoeba (tatoeba.org), CC BY 2.0 FR.</Text>
    </ScrollView>
  );
}

function Session({ round, onDone }: { round: Round; onDone: (score: number) => void }) {
  const s = useStyles();
  const [i, setI] = useState(0);
  const [correct, setCorrect] = useState(0);
  const { record } = useActivity();
  const total = round.items.length;
  const next = (ok: boolean) => {
    record();
    const n = correct + (ok ? 1 : 0);
    setCorrect(n);
    if (i + 1 >= total) onDone(n);
    else setI(i + 1);
  };
  const top = (
    <View style={s.top}>
      <View style={s.bar}>
        <View style={[s.barFill, { width: `${(i / total) * 100}%` }]} />
      </View>
      <Text style={s.counter}>
        {i + 1} / {total}
      </Text>
    </View>
  );
  const item = round.items[i];
  return (
    <KeyboardAvoid>
      <ScrollView contentContainerStyle={s.practice} keyboardShouldPersistTaps="handled">
        <SentenceExercise key={i} sentence={item.sentence} kind={item.kind} top={top} onNext={next} />
      </ScrollView>
    </KeyboardAvoid>
  );
}

function Result({ score, total, onAgain, onSetup }: { score: number; total: number; onAgain: () => void; onSetup: () => void }) {
  const s = useStyles();
  return (
    <View style={s.center}>
      <Text style={{ fontSize: 56 }}>{score / total >= 0.8 ? '🎉' : '💪'}</Text>
      <Text style={s.big} maxFontSizeMultiplier={SCALE.title}>
        {score} / {total} correct
      </Text>
      <View style={s.buttons}>
        <View style={s.row}>
          <Button label="Change level" variant="secondary" onPress={onSetup} />
          <Button label="New round" onPress={onAgain} />
        </View>
        <View style={s.row}>
          <Button label="Back to exercises" variant="secondary" onPress={() => router.back()} />
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { paddingHorizontal: 16, paddingBottom: 30, gap: 10 },
  intro: { ...F.regular, fontSize: 15, lineHeight: 21, color: c.muted, marginBottom: 6 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.card, borderRadius: 18, borderWidth: 1.5, borderColor: c.border, paddingHorizontal: 16, paddingVertical: 14 },
  title: { ...F.semibold, fontSize: 16, color: c.text },
  sub: { ...F.regular, fontSize: 13, color: c.muted },
  count: { ...F.medium, fontSize: 14, color: c.muted },
  credit: { ...F.regular, fontSize: 12, color: c.muted, marginTop: 8, textAlign: 'center' },
  practice: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 30 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: c.surface, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: c.primary },
  counter: { ...F.regular, fontSize: 14, color: c.muted },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  big: { ...F.bold, fontSize: 26, color: c.text },
  buttons: { alignSelf: 'stretch', gap: 10, marginTop: 24 },
  row: { flexDirection: 'row', gap: 8 },
}));
