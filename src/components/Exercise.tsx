import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { checkAnswer } from '../lib/answer';
import type { Outcome, Status } from '../lib/engine';
import { WORDS, englishOf, type Word } from '../lib/vocab';
import { Button } from './Button';
import { SpeakButton } from './WordCard';
import { F, makeStyles, useTheme, type Accent } from '../lib/theme';

interface Props {
  word: Word;
  status: Status;
  top?: ReactNode; // shown at the top of the card (status pill, counter)
  onAnswered: (o: Outcome) => void;
}

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

/** New → multiple choice. Familiar → type English. Fluent & Mastered → type Italian. */
export function Exercise(props: Props) {
  return props.status === 'new' ? <MultipleChoice {...props} /> : <TypeAnswer {...props} />;
}

function MultipleChoice({ word, top, onAnswered }: Props) {
  const s = useStyles();
  const { c } = useTheme();
  const options = useMemo(() => {
    const mine = englishOf(word);
    const others = WORDS.filter((w) => w.id !== word.id && !englishOf(w).some((e) => mine.includes(e)));
    const samePos = others.filter((w) => w.pos === word.pos);
    const pool = shuffle(samePos.length >= 3 ? samePos : others).slice(0, 3);
    return shuffle([word, ...pool]);
  }, [word]);
  const [picked, setPicked] = useState<number | null>(null);
  const [hinted, setHinted] = useState(false);

  const done = picked !== null;
  const outcome: Outcome = picked === word.id ? (hinted ? 'hinted' : 'correct') : 'wrong';

  return (
    <Layout
      card={
        <>
          {top}
          <Prompt big={word.it} sub={word.ipa} speak={word.it} />
          <View style={{ gap: 10 }}>
            {options.map((o) => {
              const right = o.id === word.id;
              const solid = done && right ? c.accent.green.fg : done && o.id === picked ? c.accent.red.fg : null;
              const bg = solid ?? (hinted && right ? c.accent.green.soft : c.surface);
              return (
                <Pressable key={o.id} disabled={done} onPress={() => setPicked(o.id)} style={[s.option, { backgroundColor: bg }]}>
                  <Text style={[s.optionText, solid ? s.optionOn : hinted && right && { color: c.accent.green.text }]}>{o.en}</Text>
                  {solid && <Ionicons name={right ? 'checkmark-circle' : 'close-circle'} size={20} color="#FFFFFF" style={s.optionIcon} />}
                </Pressable>
              );
            })}
          </View>
        </>
      }
      done={done}
      outcome={outcome}
      footer={done ? <Button label="Next" iconRight="arrow-forward" onPress={() => onAnswered(outcome)} /> : <Button label="Hint" variant="secondary" disabled={hinted} onPress={() => setHinted(true)} />}
    />
  );
}

function TypeAnswer({ word, status, top, onAnswered }: Props) {
  const s = useStyles();
  const { c } = useTheme();
  const toEnglish = status === 'familiar';
  const accepted = toEnglish ? englishOf(word) : [word.it];
  const [text, setText] = useState('');
  const [hinted, setHinted] = useState(false);
  const [result, setResult] = useState<Outcome | null>(null);

  const check = () => {
    const r = checkAnswer(text, accepted);
    setResult(r === 'correct' && hinted ? 'hinted' : r);
  };

  return (
    <Layout
      card={
        <>
          {top}
          {toEnglish ? <Prompt big={word.it} sub={word.ipa} speak={word.it} /> : <Prompt big={word.en} sub="Type it in Italian" />}
          <TextInput
            value={text}
            onChangeText={setText}
            editable={result === null}
            placeholder={hinted ? accepted[0] : toEnglish ? 'Type in English' : 'Scrivi in italiano'}
            placeholderTextColor={hinted ? c.primary : c.muted}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            returnKeyType="done"
            onSubmitEditing={() => text.trim() && result === null && check()}
            style={[s.input, hinted && { borderColor: c.accent.purple.soft }]}
          />
          {result !== null && result !== 'correct' && <Text style={s.answer}>Answer: {accepted.join(', ')}</Text>}
          {result !== null && !toEnglish && result !== 'wrong' && (
            <View style={{ alignItems: 'center' }}>
              <SpeakButton text={word.it} size={20} look="soft" />
            </View>
          )}
        </>
      }
      done={result !== null}
      outcome={result ?? 'wrong'}
      footer={
        result === null ? (
          <View style={s.row}>
            <Button label="Hint" variant="secondary" disabled={hinted} onPress={() => setHinted(true)} />
            <Button label="Check" disabled={!text.trim()} onPress={check} />
          </View>
        ) : (
          <Button label="Next" iconRight="arrow-forward" onPress={() => onAnswered(result)} />
        )
      }
    />
  );
}

/** Card, result banner, and buttons pinned at the bottom. */
function Layout({ card, done, outcome, footer }: { card: ReactNode; done: boolean; outcome: Outcome; footer: ReactNode }) {
  const s = useStyles();
  return (
    <View style={{ flex: 1 }}>
      <View style={{ gap: 14 }}>
        <View style={s.card}>{card}</View>
        {done && <Banner outcome={outcome} />}
      </View>
      <View style={s.footer}>{footer}</View>
    </View>
  );
}

function Prompt({ big, sub, speak }: { big: string; sub?: string; speak?: string }) {
  const s = useStyles();
  return (
    <View style={s.prompt}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={s.big}>{big}</Text>
        {speak && <SpeakButton text={speak} size={20} look="soft" />}
      </View>
      {!!sub && <Text style={s.sub}>{sub}</Text>}
    </View>
  );
}

const MESSAGES: Record<Outcome, [string, Accent, keyof typeof Ionicons.glyphMap]> = {
  correct: ['Correct! +1', 'green', 'sparkles'],
  hinted: ['Correct, but hint used. Not counted.', 'amber', 'bulb'],
  close: ['Almost! Check the accents. Not counted.', 'amber', 'alert-circle'],
  wrong: ['Not quite.', 'red', 'close-circle'],
};

function Banner({ outcome }: { outcome: Outcome }) {
  const s = useStyles();
  const { c } = useTheme();
  const [msg, accent, icon] = MESSAGES[outcome];
  const tone = c.accent[accent];
  return (
    <View style={[s.banner, { backgroundColor: tone.soft }]}>
      <Ionicons name={icon} size={20} color={tone.text} />
      <Text style={[s.msg, { color: tone.text }]}>{msg}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: { backgroundColor: c.card, borderRadius: 28, padding: 22, borderWidth: 1, borderColor: c.border, gap: 20 },
  prompt: { alignItems: 'center', gap: 4, paddingTop: 18, paddingBottom: 6 },
  big: { ...F.bold, fontSize: 38, letterSpacing: -0.76, color: c.text, textAlign: 'center', flexShrink: 1 },
  sub: { ...F.regular, fontSize: 17, color: c.muted },
  option: { height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 44 },
  optionText: { ...F.regular, fontSize: 17, color: c.text, textAlign: 'center' },
  optionOn: { ...F.semibold, color: '#FFFFFF' },
  optionIcon: { position: 'absolute', right: 16 },
  input: { ...F.regular, borderWidth: 1.5, borderColor: c.border, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, fontSize: 20, color: c.text, backgroundColor: c.surface },
  answer: { ...F.medium, fontSize: 16, color: c.text, textAlign: 'center' },
  banner: { borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  msg: { ...F.semibold, fontSize: 16, flex: 1 },
  footer: { marginTop: 'auto', paddingTop: 12 },
  row: { flexDirection: 'row', gap: 8 },
}));
