import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SCALE, Text } from '../../components/Text';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { BelowHeader, KeyboardAvoid } from '../../components/BelowHeader';
import { Button } from '../../components/Button';
import { GrammarExercise } from '../../components/GrammarExercise';
import { Rich } from '../../components/Rich';
import { SpeakButton } from '../../components/WordCard';
import { LESSON_BY_ID, PASS, saveScore, type Block, type Lesson } from '../../lib/grammar';
import { useActivity } from '../../lib/activity';
import { F, makeStyles, useTheme } from '../../lib/theme';

type Phase = 'learn' | 'practice' | 'result';

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lesson = LESSON_BY_ID.get(id);
  const [phase, setPhase] = useState<Phase>('learn');
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);

  if (!lesson) return null;
  return (
    <BelowHeader>
      <Stack.Screen options={{ title: lesson.level }} />
      {phase === 'learn' && <Learn lesson={lesson} onStart={() => setPhase('practice')} />}
      {phase === 'practice' && (
        <Practice
          key={round}
          lesson={lesson}
          onDone={(n) => {
            setScore(n);
            saveScore(lesson.id, n / lesson.exercises.length);
            setPhase('result');
          }}
        />
      )}
      {phase === 'result' && (
        <Result
          lesson={lesson}
          score={score}
          onReview={() => setPhase('learn')}
          onRetry={() => {
            setRound((r) => r + 1);
            setPhase('practice');
          }}
        />
      )}
    </BelowHeader>
  );
}

function Learn({ lesson, onStart }: { lesson: Lesson; onStart: () => void }) {
  const s = useStyles();
  const { c } = useTheme();
  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Rich text={lesson.title} style={s.h1} />
      {lesson.blocks.map((b, i) => (
        <BlockView key={i} block={b} />
      ))}
      <View style={{ flexDirection: 'row', marginTop: 6 }}>
        <Button label={`Practice (${lesson.exercises.length})`} iconRight="arrow-forward" onPress={onStart} />
      </View>
      <View style={s.sources}>
        <Text style={s.sourcesTitle}>Rules checked against</Text>
        {lesson.sources.map((src) => (
          <Pressable key={src.url + src.name} onPress={() => WebBrowser.openBrowserAsync(src.url)} accessibilityRole="link" style={s.source}>
            <Ionicons name="open-outline" size={14} color={c.muted} />
            <Text style={s.sourceText}>{src.name}</Text>
          </Pressable>
        ))}
        <Text style={s.sourceText}>Every Italian word and every conjugation table was checked against Wiktionary.</Text>
      </View>
    </ScrollView>
  );
}

function BlockView({ block: b }: { block: Block }) {
  const s = useStyles();
  const { c } = useTheme();
  if (b.type === 'text') return <Rich text={b.text} style={s.p} />;
  if (b.type === 'tip')
    return (
      <View style={[s.tip, { backgroundColor: c.accent.amber.soft }]}>
        <Ionicons name="bulb" size={18} color={c.accent.amber.text} />
        <Rich text={b.text} style={[s.p, { flex: 1 }]} />
      </View>
    );
  if (b.type === 'examples')
    return (
      <View style={s.examples}>
        {b.items.map((e, i) => (
          <View key={i} style={s.example}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.exIt}>{e.it}</Text>
              <Text style={s.exEn}>{e.en}</Text>
            </View>
            <SpeakButton text={e.it} size={18} />
          </View>
        ))}
      </View>
    );
  // Table: scrolls sideways when wider than the screen.
  const conj = !!b.source;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={s.table}>
        <View style={[s.tr, { backgroundColor: c.surface }]}>
          {b.head.map((h, i) => (
            <Text key={i} style={[s.td, s.th, i === 0 && s.first]}>
              {h}
            </Text>
          ))}
        </View>
        {b.rows.map((r, ri) => (
          <View key={ri} style={[s.tr, ri > 0 && { borderTopWidth: 1, borderColor: c.border }]}>
            {r.map((cell, ci) => {
              const italian = b.it.includes(ci) || (conj && ci > 0);
              return italian ? (
                <Text key={ci} style={[s.td, F.semibold, ci === 0 && s.first]}>
                  {cell}
                </Text>
              ) : (
                <Rich key={ci} text={cell} style={[s.td, ci === 0 && s.first, ci === 0 && { color: c.muted }]} />
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function Practice({ lesson, onDone }: { lesson: Lesson; onDone: (correct: number) => void }) {
  const s = useStyles();
  const [i, setI] = useState(0);
  const [correct, setCorrect] = useState(0);
  const { record } = useActivity();
  const total = lesson.exercises.length;
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
  return (
    <KeyboardAvoid>
      <ScrollView contentContainerStyle={s.practice} keyboardShouldPersistTaps="handled">
        <GrammarExercise key={i} ex={lesson.exercises[i]} top={top} onNext={next} />
      </ScrollView>
    </KeyboardAvoid>
  );
}

function Result({ lesson, score, onReview, onRetry }: { lesson: Lesson; score: number; onReview: () => void; onRetry: () => void }) {
  const s = useStyles();
  const total = lesson.exercises.length;
  const passed = score / total >= PASS;
  return (
    <View style={s.center}>
      <Text style={s.big}>{passed ? '🎉' : '💪'}</Text>
      <Text style={s.h1} maxFontSizeMultiplier={SCALE.title}>
        {score} / {total} correct
      </Text>
      <Text style={s.resultText}>{passed ? 'Lesson done!' : `You need ${Math.ceil(total * PASS)} to complete the lesson.`}</Text>
      <View style={s.buttons}>
        <View style={s.row}>
          <Button label="Review lesson" variant="secondary" onPress={onReview} />
          <Button label="Try again" variant="secondary" onPress={onRetry} />
        </View>
        <View style={s.row}>
          <Button label="All lessons" onPress={() => router.back()} />
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40, gap: 16 },
  h1: { ...F.bold, fontSize: 26, letterSpacing: -0.5, color: c.text },
  p: { ...F.regular, fontSize: 16, lineHeight: 24, color: c.text },
  tip: { flexDirection: 'row', gap: 10, borderRadius: 18, padding: 14 },
  examples: { backgroundColor: c.card, borderRadius: 20, borderWidth: 1, borderColor: c.border, paddingHorizontal: 16, paddingVertical: 6 },
  example: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  exIt: { ...F.semibold, fontSize: 16, color: c.text },
  exEn: { ...F.regular, fontSize: 14, color: c.muted },
  table: { flexGrow: 1, backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
  tr: { flexDirection: 'row' },
  td: { ...F.regular, fontSize: 15, color: c.text, paddingHorizontal: 12, paddingVertical: 10, minWidth: 90, maxWidth: 240, flexGrow: 1, flexBasis: 0 },
  th: { ...F.semibold, fontSize: 13, color: c.muted },
  first: { minWidth: 80 },
  sources: { gap: 8, marginTop: 10, paddingTop: 16, borderTopWidth: 1, borderColor: c.border },
  sourcesTitle: { ...F.semibold, fontSize: 14, color: c.muted },
  source: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sourceText: { ...F.regular, fontSize: 13, color: c.muted, flexShrink: 1 },
  practice: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 30 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: c.surface, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: c.primary },
  counter: { ...F.regular, fontSize: 14, color: c.muted },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  big: { fontSize: 56 },
  resultText: { ...F.regular, fontSize: 16, color: c.muted, textAlign: 'center' },
  buttons: { alignSelf: 'stretch', gap: 10, marginTop: 24 },
  row: { flexDirection: 'row', gap: 8 },
}));
