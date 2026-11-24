import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Text, TextInput } from './Text';
import { Ionicons } from '@expo/vector-icons';
import { checkExact, normalize } from '../lib/answer';
import type { GrammarExercise as Ex } from '../lib/grammar';
import { Button } from './Button';
import { Rich } from './Rich';
import { F, makeStyles, useTheme } from '../lib/theme';

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

type Result = 'correct' | 'close' | 'wrong' | 'shown';

interface Props {
  ex: Ex;
  top: ReactNode; // counter row
  onNext: (correct: boolean) => void;
}

export function GrammarExercise(props: Props) {
  if (props.ex.type === 'choice') return <Choice {...props} ex={props.ex} />;
  if (props.ex.type === 'fill') return <Fill {...props} ex={props.ex} />;
  return <Order {...props} ex={props.ex} />;
}

/** Italian sentence with the gap highlighted, English below. */
function Prompt({ it, en, gap }: { it: string; en: string; gap?: string }) {
  const s = useStyles();
  const { c } = useTheme();
  if (!it) return <Text style={s.question}>{en}</Text>;
  const parts = it.split(/_{2,}/);
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.it}>
        {parts.map((p, i) => (
          <Text key={i}>
            {p}
            {i < parts.length - 1 && <Text style={[s.gap, { color: gap ? c.primary : c.muted }]}>{gap ?? ' ____ '}</Text>}
          </Text>
        ))}
      </Text>
      {!!en && <Text style={s.en}>{en}</Text>}
    </View>
  );
}

function Choice({ ex, top, onNext }: Props & { ex: Extract<Ex, { type: 'choice' }> }) {
  const s = useStyles();
  const { c } = useTheme();
  const order = useMemo(() => shuffle(ex.options.map((_, i) => i)), [ex]);
  const [picked, setPicked] = useState<number | null>(null);
  const done = picked !== null;
  const result: Result = picked === ex.answer ? 'correct' : 'wrong';
  return (
    <Layout
      top={top}
      card={
        <>
          <Prompt it={ex.it} en={ex.en} gap={done ? ex.options[ex.answer] : undefined} />
          <View style={{ gap: 10 }}>
            {order.map((i) => {
              const right = i === ex.answer;
              const solid = done && right ? c.accent.green.fg : done && i === picked ? c.accent.red.fg : null;
              return (
                <Pressable key={i} disabled={done} onPress={() => setPicked(i)} style={[s.option, { backgroundColor: solid ?? c.surface }]}>
                  <Text style={[s.optionText, solid && s.optionOn]}>{ex.options[i]}</Text>
                  {solid && <Ionicons name={right ? 'checkmark-circle' : 'close-circle'} size={20} color="#FFFFFF" style={s.optionIcon} />}
                </Pressable>
              );
            })}
          </View>
        </>
      }
      result={done ? result : null}
      why={ex.why}
      footer={done ? <Button label="Next" iconRight="arrow-forward" onPress={() => onNext(result === 'correct')} /> : null}
    />
  );
}

function Fill({ ex, top, onNext }: Props & { ex: Extract<Ex, { type: 'fill' }> }) {
  const s = useStyles();
  const { c } = useTheme();
  const [text, setText] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const check = () => text.trim() && result === null && setResult(checkExact(text, ex.answers));
  return (
    <Layout
      top={top}
      card={
        <>
          <Prompt it={ex.it} en={ex.en} gap={result ? ex.answers[0] : undefined} />
          <TextInput
            value={text}
            onChangeText={setText}
            editable={result === null}
            placeholder="Type the missing part"
            placeholderTextColor={c.muted}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            returnKeyType="done"
            onSubmitEditing={check}
            style={s.input}
          />
          {result !== null && result !== 'correct' && <Text style={s.answer}>Answer: {ex.answers.join(' / ')}</Text>}
        </>
      }
      result={result}
      why={ex.why}
      footer={
        result === null ? (
          <View style={s.row}>
            <Button label="Show answer" variant="secondary" onPress={() => setResult('shown')} />
            <Button label="Check" disabled={!text.trim()} onPress={check} />
          </View>
        ) : (
          <Button label="Next" iconRight="arrow-forward" onPress={() => onNext(result === 'correct')} />
        )
      }
    />
  );
}

function Order({ ex, top, onNext }: Props & { ex: Extract<Ex, { type: 'order' }> }) {
  const s = useStyles();
  const words = useMemo(() => ex.sentence.split(' '), [ex]);
  const pool = useMemo(() => {
    // Shuffle, but never show the words already in the right order.
    let p = shuffle(words.map((_, i) => i));
    for (let n = 0; n < 5 && p.every((v, i) => words[v] === words[i]); n++) p = shuffle(p);
    return p;
  }, [words]);
  const [chosen, setChosen] = useState<number[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const done = result !== null;
  const check = () => setResult(normalize(chosen.map((i) => words[i]).join(' ')) === normalize(ex.sentence) ? 'correct' : 'wrong');
  const chip = (i: number, onPress: () => void, used = false) => (
    <Pressable key={i} disabled={done || used} onPress={onPress} style={[s.chip, used && s.chipUsed]}>
      <Text style={[s.chipText, used && { opacity: 0 }]}>{words[i]}</Text>
    </Pressable>
  );
  return (
    <Layout
      top={top}
      card={
        <>
          <Text style={s.question}>{ex.en}</Text>
          <View style={[s.line, s.chips]}>{chosen.map((i) => chip(i, () => setChosen((c) => c.filter((x) => x !== i))))}</View>
          <View style={s.chips}>{pool.map((i) => chip(i, () => setChosen((c) => [...c, i]), chosen.includes(i)))}</View>
          {(result === 'wrong' || result === 'shown') && <Text style={s.answer}>Answer: {ex.sentence}</Text>}
        </>
      }
      result={result}
      why={ex.why}
      footer={
        done ? (
          <Button label="Next" iconRight="arrow-forward" onPress={() => onNext(result === 'correct')} />
        ) : (
          <View style={s.row}>
            <Button label="Show answer" variant="secondary" onPress={() => setResult('shown')} />
            <Button label="Check" disabled={chosen.length !== words.length} onPress={check} />
          </View>
        )
      }
    />
  );
}

const MESSAGES: Record<Result, [string, 'green' | 'amber' | 'red', keyof typeof Ionicons.glyphMap]> = {
  correct: ['Correct!', 'green', 'sparkles'],
  close: ['Almost — check the accents.', 'amber', 'alert-circle'],
  wrong: ['Not quite.', 'red', 'close-circle'],
  shown: ['Answer shown. Not counted.', 'amber', 'eye'],
};

/** Card, feedback with the rule, buttons pinned at the bottom. */
function Layout({ top, card, result, why, footer }: { top: ReactNode; card: ReactNode; result: Result | null; why: string; footer: ReactNode }) {
  const s = useStyles();
  const { c } = useTheme();
  const [msg, accent, icon] = result ? MESSAGES[result] : MESSAGES.correct;
  const tone = c.accent[accent];
  return (
    <View style={{ flex: 1 }}>
      <View style={{ gap: 14 }}>
        <View style={s.card}>
          {top}
          {card}
        </View>
        {result && (
          <View style={[s.banner, { backgroundColor: tone.soft }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name={icon} size={20} color={tone.text} />
              <Text style={[s.msg, { color: tone.text }]}>{msg}</Text>
            </View>
            <Rich text={why} style={s.why} />
          </View>
        )}
      </View>
      {footer && <View style={s.footer}>{footer}</View>}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: { backgroundColor: c.card, borderRadius: 28, padding: 22, borderWidth: 1, borderColor: c.border, gap: 20 },
  it: { ...F.semibold, fontSize: 22, lineHeight: 32, color: c.text },
  gap: { ...F.bold },
  en: { ...F.regular, fontSize: 15, color: c.muted },
  question: { ...F.semibold, fontSize: 19, lineHeight: 27, color: c.text },
  option: { minHeight: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 44, paddingVertical: 12 },
  optionText: { ...F.regular, fontSize: 17, color: c.text, textAlign: 'center' },
  optionOn: { ...F.semibold, color: '#FFFFFF' },
  optionIcon: { position: 'absolute', right: 16 },
  input: { ...F.regular, borderWidth: 1.5, borderColor: c.border, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, fontSize: 20, color: c.text, backgroundColor: c.surface },
  answer: { ...F.medium, fontSize: 16, color: c.text, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  line: { minHeight: 56, borderBottomWidth: 1.5, borderColor: c.border, paddingBottom: 8, alignContent: 'flex-end' },
  chip: { backgroundColor: c.surface, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: c.border },
  chipUsed: { backgroundColor: c.bg, borderStyle: 'dashed' },
  chipText: { ...F.medium, fontSize: 17, color: c.text },
  banner: { borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16, gap: 8 },
  msg: { ...F.semibold, fontSize: 16, flex: 1 },
  why: { ...F.regular, fontSize: 15, lineHeight: 21, color: c.text },
  footer: { marginTop: 'auto', paddingTop: 12 },
  row: { flexDirection: 'row', gap: 8 },
}));
