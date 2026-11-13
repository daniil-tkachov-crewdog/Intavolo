import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useStore } from '../lib/store';
import { WORDS, WORD_BY_ID, englishOf, type Word } from '../lib/vocab';
import { checkAnswer } from '../lib/answer';
import { BelowHeader } from '../components/BelowHeader';
import { Button } from '../components/Button';
import { SpeakButton } from '../components/WordCard';
import { F, makeStyles, useTheme } from '../lib/theme';

const BATCH = 6;
const STEPS = ['Meet', 'Recognize', 'Match', 'Recall'] as const;
const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

export default function Learn() {
  const s = useStyles();
  const { c } = useTheme();
  const { progress } = useStore();
  const [round, setRound] = useState(0);
  const [seen, setSeen] = useState<Set<number>>(new Set()); // learned earlier in this visit
  // Words freshly added: still New with 0 points. Picked once per round.
  const batch = useMemo(
    () =>
      shuffle(
        [...progress.values()]
          .filter((p) => p.status === 'new' && p.count === 0 && !seen.has(p.wordId) && WORD_BY_ID.has(p.wordId))
          .map((p) => WORD_BY_ID.get(p.wordId)!)
      ).slice(0, BATCH),
    [round] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <BelowHeader>
      {batch.length ? (
        <Session key={round} words={batch} onAgain={() => {
            setSeen((x) => new Set([...x, ...batch.map((w) => w.id)]));
            setRound((r) => r + 1);
          }} />
      ) : (
        <Center title="Nothing new to learn" text="Add words with Learn in Explore. Only New words with 0 points show up here.">
          <View style={s.row}>
            <Button label="Go to Explore" onPress={() => router.navigate('/')} />
          </View>
        </Center>
      )}
    </BelowHeader>
  );
}

function Session({ words, onAgain }: { words: Word[]; onAgain: () => void }) {
  const s = useStyles();
  const { c } = useTheme();
  const [step, setStep] = useState(0);
  const next = () => setStep((n) => n + 1);

  if (step >= STEPS.length) {
    return (
      <Center title="Nice work 🎉" text={`${words.length} word${words.length > 1 ? 's' : ''} learned. Now practise them in Test your vocabulary.`}>
        <View style={[s.row, { width: 260 }]}>
          <Button label="Learn more" variant="secondary" onPress={onAgain} />
          <Button label="Test" onPress={() => router.replace('/vocab-test')} />
        </View>
      </Center>
    );
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} keyboardVerticalOffset={100}>
      <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
        <View style={s.steps}>
          {STEPS.map((t, i) => (
            <View key={t} style={{ flex: 1, gap: 4 }}>
              <View style={[s.bar, i <= step && { backgroundColor: c.primary }]} />
              <Text style={[s.stepText, i === step && { color: c.primary }]}>{t}</Text>
            </View>
          ))}
        </View>
        {step === 0 && <Meet words={words} onDone={next} />}
        {step === 1 && <Queue words={words} onDone={next} render={(w, done) => <Recognize word={w} words={words} onDone={done} />} />}
        {step === 2 && <Match words={words} onDone={next} />}
        {step === 3 && <Queue words={words} onDone={next} render={(w, done) => <Recall word={w} onDone={done} />} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Goes through words one by one; wrong ones come back at the end. */
function Queue({ words, onDone, render }: { words: Word[]; onDone: () => void; render: (w: Word, done: (ok: boolean) => void) => React.ReactNode }) {
  const [queue, setQueue] = useState(() => shuffle(words));
  const [n, setN] = useState(0);
  const w = queue[0];
  const done = (ok: boolean) => {
    const rest = queue.slice(1);
    const q = ok ? rest : [...rest, w];
    setN((x) => x + 1);
    if (q.length) setQueue(q);
    else onDone();
  };
  return <View key={n}>{render(w, done)}</View>;
}

function Meet({ words, onDone }: { words: Word[]; onDone: () => void }) {
  const s = useStyles();
  const { c } = useTheme();
  const [i, setI] = useState(0);
  const w = words[i];
  const ex = w.examples[0];
  return (
    <View style={s.card}>
      <Text style={s.counter}>
        {i + 1} / {words.length}
      </Text>
      <Big word={w} />
      <Text style={s.en}>{englishOf(w).join(', ')}</Text>
      {!!w.pos && <Text style={s.pos}>{w.pos}</Text>}
      {ex && (
        <View style={s.example}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[s.exIt, { flex: 1 }]}>{ex.it}</Text>
            <SpeakButton text={ex.it} size={18} />
          </View>
          <Text style={s.exEn}>{ex.en}</Text>
        </View>
      )}
      <View style={s.row}>
        {i > 0 && <Button label="Back" variant="secondary" onPress={() => setI(i - 1)} />}
        <Button label={i + 1 < words.length ? 'Got it' : 'Start practice'} onPress={() => (i + 1 < words.length ? setI(i + 1) : onDone())} />
      </View>
    </View>
  );
}

function Recognize({ word, words, onDone }: { word: Word; words: Word[]; onDone: (ok: boolean) => void }) {
  const s = useStyles();
  const { c } = useTheme();
  const options = useMemo(() => {
    const mine = englishOf(word);
    const clash = (w: Word) => w.id === word.id || englishOf(w).some((e) => mine.includes(e));
    const fromBatch = words.filter((w) => !clash(w));
    const extra = shuffle(WORDS.filter((w) => w.pos === word.pos && !clash(w))).slice(0, 3);
    return shuffle([word, ...shuffle([...fromBatch, ...extra]).slice(0, 3)]);
  }, [word, words]);
  const [picked, setPicked] = useState<number | null>(null);
  const done = picked !== null;
  const ok = picked === word.id;

  return (
    <View style={s.card}>
      <Big word={word} />
      <View style={{ gap: 10, marginTop: 20 }}>
        {options.map((o) => {
          const right = o.id === word.id;
          const solid = done && right ? c.accent.green.fg : done && o.id === picked ? c.accent.red.fg : null;
          return (
            <Pressable key={o.id} disabled={done} onPress={() => setPicked(o.id)} style={[s.option, { backgroundColor: solid ?? c.surface }]}>
              <Text style={[s.optionText, solid && s.optionOn]}>{o.en}</Text>
              {solid && <Ionicons name={right ? 'checkmark-circle' : 'close-circle'} size={20} color="#FFFFFF" style={s.optionIcon} />}
            </Pressable>
          );
        })}
      </View>
      {done && <Result ok={ok} onNext={() => onDone(ok)} />}
    </View>
  );
}

function Match({ words, onDone }: { words: Word[]; onDone: () => void }) {
  const s = useStyles();
  const { c } = useTheme();
  const left = useMemo(() => shuffle(words), [words]);
  const right = useMemo(() => shuffle(words), [words]);
  const [sel, setSel] = useState<{ side: 'l' | 'r'; id: number } | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<{ l: number; r: number } | null>(null);

  const tap = (side: 'l' | 'r', id: number) => {
    setWrong(null);
    if (!sel || sel.side === side) return setSel({ side, id });
    if (sel.id === id) {
      const m = new Set(matched).add(id);
      setMatched(m);
      setSel(null);
      if (m.size === words.length) setTimeout(onDone, 400);
    } else {
      setWrong(side === 'l' ? { l: id, r: sel.id } : { l: sel.id, r: id });
      setSel(null);
    }
  };

  const cell = (side: 'l' | 'r', w: Word) => {
    const done = matched.has(w.id);
    const on = sel?.side === side && sel.id === w.id;
    const bad = wrong?.[side] === w.id;
    return (
      <Pressable
        key={w.id}
        disabled={done}
        onPress={() => tap(side, w.id)}
        style={[s.cell, on && { borderColor: c.primary, backgroundColor: c.accent.purple.soft }, bad && { borderColor: c.accent.red.fg }, done && { opacity: 0.3 }]}
      >
        <Text style={s.cellText} numberOfLines={2}>
          {side === 'l' ? w.it : w.en}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={s.card}>
      <Text style={s.hintText}>Tap the matching pairs</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <View style={{ flex: 1, gap: 8 }}>{left.map((w) => cell('l', w))}</View>
        <View style={{ flex: 1, gap: 8 }}>{right.map((w) => cell('r', w))}</View>
      </View>
    </View>
  );
}

function Recall({ word, onDone }: { word: Word; onDone: (ok: boolean) => void }) {
  const s = useStyles();
  const { c } = useTheme();
  const accepted = englishOf(word);
  const [text, setText] = useState('');
  const [ok, setOk] = useState<boolean | null>(null);
  const check = () => setOk(checkAnswer(text, accepted) !== 'wrong');

  return (
    <View style={s.card}>
      <Big word={word} />
      <TextInput
        value={text}
        onChangeText={setText}
        editable={ok === null}
        placeholder="Type in English"
        placeholderTextColor={c.muted}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        returnKeyType="done"
        onSubmitEditing={() => text.trim() && ok === null && check()}
        style={s.input}
      />
      {ok === null ? (
        <View style={s.row}>
          <Button label="Show me" variant="secondary" onPress={() => setOk(false)} />
          <Button label="Check" disabled={!text.trim()} onPress={check} />
        </View>
      ) : (
        <>
          {!ok && <Text style={s.answer}>Answer: {accepted.join(', ')}</Text>}
          <Result ok={ok} onNext={() => onDone(ok)} />
        </>
      )}
    </View>
  );
}

function Big({ word }: { word: Word }) {
  const s = useStyles();
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={s.big}>{word.it}</Text>
        <SpeakButton text={word.it} size={20} look="soft" />
      </View>
      {!!word.ipa && <Text style={s.sub}>{word.ipa}</Text>}
    </View>
  );
}

function Result({ ok, onNext }: { ok: boolean; onNext: () => void }) {
  const s = useStyles();
  const { c } = useTheme();
  const tone = ok ? c.accent.green : c.accent.red;
  return (
    <View style={{ marginTop: 16, gap: 12 }}>
      <View style={[s.banner, { backgroundColor: tone.soft }]}>
        <Ionicons name={ok ? 'sparkles' : 'close-circle'} size={20} color={tone.text} />
        <Text style={[s.msg, { color: tone.text }]}>{ok ? 'Correct!' : "Not quite. You'll see it again."}</Text>
      </View>
      <View style={s.row}>
        <Button label="Next" iconRight="arrow-forward" onPress={onNext} />
      </View>
    </View>
  );
}

function Center({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  const s = useStyles();
  const { c } = useTheme();
  return (
    <View style={s.center}>
      <Text style={s.title}>{title}</Text>
      <Text style={s.text}>{text}</Text>
      {children}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },
  steps: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  bar: { height: 4, borderRadius: 2, backgroundColor: c.border },
  stepText: { ...F.semibold, fontSize: 12, color: c.muted, textAlign: 'center' },
  card: { backgroundColor: c.card, borderRadius: 28, padding: 22, borderWidth: 1, borderColor: c.border },
  counter: { ...F.regular, fontSize: 14, color: c.muted, textAlign: 'right', marginBottom: 8 },
  big: { ...F.bold, fontSize: 38, letterSpacing: -0.76, color: c.text, textAlign: 'center', flexShrink: 1 },
  sub: { ...F.regular, fontSize: 17, color: c.muted, marginTop: 4 },
  en: { ...F.semibold, fontSize: 26, letterSpacing: -0.26, color: c.accent.purple.text, textAlign: 'center', marginTop: 18 },
  pos: { ...F.regular, fontSize: 13, color: c.muted, fontStyle: 'italic', textAlign: 'center', marginTop: 4 },
  example: { backgroundColor: c.surface, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, marginTop: 18, gap: 2 },
  exIt: { ...F.regular, fontSize: 16, color: c.text },
  exEn: { ...F.regular, fontSize: 14, color: c.muted },
  option: { height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 44 },
  optionText: { ...F.regular, fontSize: 17, color: c.text, textAlign: 'center' },
  optionOn: { ...F.semibold, color: '#FFFFFF' },
  optionIcon: { position: 'absolute', right: 16 },
  cell: { minHeight: 52, borderRadius: 14, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surface, padding: 8, alignItems: 'center', justifyContent: 'center' },
  cellText: { ...F.medium, fontSize: 15, color: c.text, textAlign: 'center' },
  hintText: { ...F.regular, color: c.muted, textAlign: 'center' },
  input: { ...F.regular, marginTop: 24, borderWidth: 1.5, borderColor: c.border, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, fontSize: 20, color: c.text, backgroundColor: c.surface },
  answer: { ...F.medium, fontSize: 16, color: c.text, textAlign: 'center', marginTop: 14 },
  banner: { borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  msg: { ...F.semibold, fontSize: 16, flex: 1 },
  row: { flexDirection: 'row', gap: 8, marginTop: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { ...F.bold, fontSize: 22, color: c.text },
  text: { ...F.regular, fontSize: 16, color: c.muted, marginTop: 8, textAlign: 'center' },
}));
