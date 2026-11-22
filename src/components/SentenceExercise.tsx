import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { matchesTiles, matchesTranslation, tiles } from '../lib/translate';
import type { Sentence } from '../lib/sentences';
import { Button } from './Button';
import { SpeakButton } from './WordCard';
import { F, makeStyles, useTheme } from '../lib/theme';

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

type Result = 'correct' | 'self-right' | 'self-wrong' | 'wrong' | 'shown';
export type Kind = 'type' | 'tiles';

interface Props {
  sentence: Sentence;
  kind: Kind;
  top: ReactNode;
  onNext: (correct: boolean) => void;
}

export function SentenceExercise(props: Props) {
  return props.kind === 'type' ? <TypeTranslation {...props} /> : <WordBank {...props} />;
}

/** Typed translation: automatic match, otherwise the learner decides. */
function TypeTranslation({ sentence, top, onNext }: Props) {
  const s = useStyles();
  const { c } = useTheme();
  const [text, setText] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [judging, setJudging] = useState(false); // no automatic match: show translations, learner decides
  const check = () => {
    if (!text.trim() || result || judging) return;
    if (matchesTranslation(text, sentence.en)) setResult('correct');
    else setJudging(true);
  };
  const done = result !== null;
  return (
    <Layout
      top={top}
      sentence={sentence}
      task="Translate into English"
      body={
        <>
          <TextInput
            value={text}
            onChangeText={setText}
            editable={!done && !judging}
            placeholder="Type in English"
            placeholderTextColor={c.muted}
            autoCapitalize="sentences"
            autoCorrect
            multiline
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={check}
            style={s.input}
          />
          {judging && !done && (
            <View style={s.judge}>
              <Text style={s.judgeTitle}>No automatic match. Compare with the translations:</Text>
              <Translations list={sentence.en} />
              <Text style={s.judgeTitle}>Did you mean the same?</Text>
            </View>
          )}
        </>
      }
      result={result}
      after={done ? <Translations list={sentence.en} label={sentence.en.length > 1 ? 'Translations' : 'Translation'} /> : null}
      footer={
        done ? (
          <Button label="Next" iconRight="arrow-forward" onPress={() => onNext(result === 'correct' || result === 'self-right')} />
        ) : judging ? (
          <View style={s.row}>
            <Button label="I was wrong" variant="secondary" onPress={() => setResult('self-wrong')} />
            <Button label="I was right" variant="success" onPress={() => setResult('self-right')} />
          </View>
        ) : (
          <View style={s.row}>
            <Button label="Show answer" variant="secondary" onPress={() => setResult('shown')} />
            <Button label="Check" disabled={!text.trim()} onPress={check} />
          </View>
        )
      }
    />
  );
}

/** Build the English translation from word tiles. One correct order, no self-check. */
function WordBank({ sentence, top, onNext }: Props) {
  const s = useStyles();
  // Use the shortest translation for the tiles.
  const target = useMemo(() => [...sentence.en].sort((a, b) => a.length - b.length)[0], [sentence]);
  const words = useMemo(() => tiles(target), [target]);
  const pool = useMemo(() => {
    let p = shuffle(words.map((_, i) => i));
    for (let n = 0; n < 5 && words.length > 1 && p.every((v, i) => words[v] === words[i]); n++) p = shuffle(p);
    return p;
  }, [words]);
  const [chosen, setChosen] = useState<number[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const done = result !== null;
  const check = () => setResult(matchesTiles(chosen.map((i) => words[i]), sentence.en) ? 'correct' : 'wrong');
  const chip = (i: number, onPress: () => void, used = false) => (
    <Pressable key={i} disabled={done || used} onPress={onPress} style={[s.chip, used && s.chipUsed]}>
      <Text style={[s.chipText, used && { opacity: 0 }]}>{words[i]}</Text>
    </Pressable>
  );
  return (
    <Layout
      top={top}
      sentence={sentence}
      task="Build the English translation"
      body={
        <>
          <View style={[s.line, s.chips]}>{chosen.map((i) => chip(i, () => setChosen((c) => c.filter((x) => x !== i))))}</View>
          <View style={s.chips}>{pool.map((i) => chip(i, () => setChosen((c) => [...c, i]), chosen.includes(i)))}</View>
          {(result === 'wrong' || result === 'shown') && <Text style={s.answer}>Answer: {target}</Text>}
        </>
      }
      result={result}
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

function Translations({ list, label }: { list: string[]; label?: string }) {
  const s = useStyles();
  return (
    <View style={{ gap: 4 }}>
      {label && <Text style={s.judgeTitle}>{label}</Text>}
      {list.slice(0, 6).map((t, i) => (
        <Text key={i} style={s.translation}>
          • {t}
        </Text>
      ))}
      {list.length > 6 && <Text style={s.judgeTitle}>+ {list.length - 6} more</Text>}
    </View>
  );
}

const MESSAGES: Record<Result, [string, 'green' | 'amber' | 'red', keyof typeof Ionicons.glyphMap]> = {
  correct: ['Correct!', 'green', 'sparkles'],
  'self-right': ['Counted as correct.', 'green', 'checkmark-circle'],
  'self-wrong': ['Not counted.', 'red', 'close-circle'],
  wrong: ['Not quite.', 'red', 'close-circle'],
  shown: ['Answer shown. Not counted.', 'amber', 'eye'],
};

function Layout(props: { top: ReactNode; sentence: Sentence; task: string; body: ReactNode; result: Result | null; after?: ReactNode; footer: ReactNode }) {
  const { top, sentence, task, body, result, after, footer } = props;
  const s = useStyles();
  const { c } = useTheme();
  const tone = result ? c.accent[MESSAGES[result][1]] : null;
  return (
    <View style={{ flex: 1 }}>
      <View style={{ gap: 14 }}>
        <View style={s.card}>
          {top}
          <View style={{ gap: 6 }}>
            <Text style={s.task}>{task}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={s.it}>{sentence.it}</Text>
              <SpeakButton text={sentence.it} size={20} look="soft" />
            </View>
          </View>
          {body}
        </View>
        {result && tone && (
          <View style={[s.banner, { backgroundColor: tone.soft }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name={MESSAGES[result][2]} size={20} color={tone.text} />
              <Text style={[s.msg, { color: tone.text }]}>{MESSAGES[result][0]}</Text>
            </View>
            {after}
          </View>
        )}
      </View>
      <View style={s.footer}>{footer}</View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: { backgroundColor: c.card, borderRadius: 28, padding: 22, borderWidth: 1, borderColor: c.border, gap: 18 },
  task: { ...F.medium, fontSize: 14, color: c.muted },
  it: { ...F.semibold, fontSize: 22, lineHeight: 30, color: c.text, flexShrink: 1 },
  input: { ...F.regular, borderWidth: 1.5, borderColor: c.border, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, fontSize: 18, minHeight: 56, color: c.text, backgroundColor: c.surface },
  judge: { gap: 8 },
  judgeTitle: { ...F.semibold, fontSize: 14, color: c.muted },
  translation: { ...F.regular, fontSize: 16, lineHeight: 22, color: c.text },
  answer: { ...F.medium, fontSize: 16, color: c.text, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  line: { minHeight: 56, borderBottomWidth: 1.5, borderColor: c.border, paddingBottom: 8, alignContent: 'flex-end' },
  chip: { backgroundColor: c.surface, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: c.border },
  chipUsed: { backgroundColor: c.bg, borderStyle: 'dashed' },
  chipText: { ...F.medium, fontSize: 17, color: c.text },
  banner: { borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16, gap: 10 },
  msg: { ...F.semibold, fontSize: 16, flex: 1 },
  footer: { marginTop: 'auto', paddingTop: 12 },
  row: { flexDirection: 'row', gap: 8 },
}));
