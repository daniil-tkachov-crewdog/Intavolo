import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { checkAnswer } from '../lib/answer';
import type { Outcome, Status } from '../lib/engine';
import { WORDS, type Word } from '../lib/vocab';
import { Button } from './Button';
import { SpeakButton } from './WordCard';
import { C, shadow } from '../lib/theme';

interface Props {
  word: Word;
  status: Status;
  onAnswered: (o: Outcome) => void;
}

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);
const label = (w: Word) => w.en.slice(0, 2).join(', ');

/** New → multiple choice. Familiar → type English. Fluent & Mastered → type Italian. */
export function Exercise(props: Props) {
  return props.status === 'new' ? <MultipleChoice {...props} /> : <TypeAnswer {...props} />;
}

function MultipleChoice({ word, onAnswered }: Props) {
  const options = useMemo(() => {
    const others = WORDS.filter((w) => w.id !== word.id && !w.en.some((e) => word.en.includes(e)));
    const samePos = others.filter((w) => w.pos === word.pos);
    const pool = shuffle(samePos.length >= 3 ? samePos : others).slice(0, 3);
    return shuffle([word, ...pool]);
  }, [word]);
  const [picked, setPicked] = useState<number | null>(null);
  const [hinted, setHinted] = useState(false);

  const done = picked !== null;
  const outcome: Outcome = picked === word.id ? (hinted ? 'hinted' : 'correct') : 'wrong';

  return (
    <View style={s.card}>
      <Prompt big={word.it} sub={word.ipa} speak={word.it} />
      <View style={{ gap: 10, marginTop: 20 }}>
        {options.map((o) => {
          const right = o.id === word.id;
          const bg = done && right ? C.primary : done && o.id === picked ? C.accent : hinted && right ? C.primary + '22' : C.bg;
          return (
            <Pressable key={o.id} disabled={done} onPress={() => setPicked(o.id)} style={[s.option, { backgroundColor: bg }]}>
              <Text style={[s.optionText, done && (right || o.id === picked) && { color: '#fff' }]}>{label(o)}</Text>
            </Pressable>
          );
        })}
      </View>
      <Footer done={done} outcome={outcome} hinted={hinted} onHint={() => setHinted(true)} onNext={() => onAnswered(outcome)} />
    </View>
  );
}

function TypeAnswer({ word, status, onAnswered }: Props) {
  const toEnglish = status === 'familiar';
  const accepted = toEnglish ? word.en : [word.it];
  const [text, setText] = useState('');
  const [hinted, setHinted] = useState(false);
  const [result, setResult] = useState<Outcome | null>(null);

  const check = () => {
    const c = checkAnswer(text, accepted);
    setResult(c === 'correct' && hinted ? 'hinted' : c);
  };

  return (
    <View style={s.card}>
      {toEnglish ? (
        <Prompt big={word.it} sub={word.ipa} speak={word.it} />
      ) : (
        <Prompt big={word.en.join(', ')} sub="Type it in Italian" />
      )}
      <TextInput
        value={text}
        onChangeText={setText}
        editable={result === null}
        placeholder={hinted ? accepted[0] : toEnglish ? 'Type in English' : 'Scrivi in italiano'}
        placeholderTextColor={hinted ? C.hint : C.muted}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        returnKeyType="done"
        onSubmitEditing={() => text.trim() && result === null && check()}
        style={[s.input, hinted && s.inputHinted]}
      />
      {result === null ? (
        <View style={s.footer}>
          <Button label="Hint" outline color={C.muted} disabled={hinted} onPress={() => setHinted(true)} />
          <Button label="Check" disabled={!text.trim()} onPress={check} />
        </View>
      ) : (
        <>
          {result !== 'correct' && <Text style={s.answer}>Answer: {accepted.join(', ')}</Text>}
          {!toEnglish && result !== 'wrong' && (
            <View style={{ alignItems: 'center' }}>
              <SpeakButton text={word.it} />
            </View>
          )}
          <Footer done outcome={result} hinted={hinted} onHint={() => {}} onNext={() => onAnswered(result)} />
        </>
      )}
    </View>
  );
}

function Prompt({ big, sub, speak }: { big: string; sub?: string; speak?: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={s.big}>{big}</Text>
        {speak && <SpeakButton text={speak} />}
      </View>
      {!!sub && <Text style={s.sub}>{sub}</Text>}
    </View>
  );
}

const MESSAGES: Record<Outcome, [string, string]> = {
  correct: ['Correct! +1', C.primary],
  hinted: ['Correct, but hint used. Not counted.', C.warn],
  close: ['Almost! Check the accents. Not counted.', C.warn],
  wrong: ['Not quite.', C.accent],
};

function Footer({ done, outcome, hinted, onHint, onNext }: { done: boolean; outcome: Outcome; hinted: boolean; onHint: () => void; onNext: () => void }) {
  if (!done) {
    return (
      <View style={s.footer}>
        <Button label="Hint" outline color={C.muted} disabled={hinted} onPress={onHint} />
      </View>
    );
  }
  const [msg, color] = MESSAGES[outcome];
  return (
    <View style={{ marginTop: 16, gap: 12 }}>
      <Text style={[s.msg, { color }]}>{msg}</Text>
      <View style={s.footer}>
        <Button label="Next" onPress={onNext} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 24, padding: 24, ...shadow },
  big: { fontSize: 34, fontWeight: '700', color: C.text, textAlign: 'center' },
  sub: { fontSize: 16, color: C.muted, marginTop: 4 },
  option: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: C.border },
  optionText: { fontSize: 17, color: C.text, textAlign: 'center' },
  input: { marginTop: 24, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, padding: 14, fontSize: 20, color: C.text, backgroundColor: C.bg },
  inputHinted: { borderColor: C.hint },
  footer: { flexDirection: 'row', gap: 10, marginTop: 16 },
  msg: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  answer: { fontSize: 16, color: C.text, textAlign: 'center', marginTop: 14 },
});
