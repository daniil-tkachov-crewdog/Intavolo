import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Word } from '../lib/vocab';
import { useStore } from '../lib/store';
import { F, glow, makeStyles, useTheme } from '../lib/theme';

/**
 * plain: bare icon · soft: round tinted button · solid: round purple button.
 */
export function SpeakButton({ text, size = 22, look = 'plain' }: { text: string; size?: number; look?: 'plain' | 'soft' | 'solid' }) {
  const { speak } = useStore();
  const { c } = useTheme();
  const round = look !== 'plain';
  const box = round ? Math.round(size * (look === 'solid' ? 2.15 : 2)) : undefined;
  return (
    <Pressable
      onPress={() => speak(text)}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Play pronunciation"
      style={({ pressed }) => [
        round
          ? { width: box, height: box, borderRadius: box! / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: look === 'solid' ? c.primary : c.accent.purple.soft }
          : { padding: 6 },
        look === 'solid' && glow,
        pressed && { opacity: 0.5 },
      ]}
    >
      <Ionicons name={look === 'plain' ? 'volume-medium-outline' : 'volume-high'} size={size} color={look === 'solid' ? '#FFFFFF' : c.primary} />
    </Pressable>
  );
}

/** Splits a sentence and marks words that look like forms of `word`. */
function highlight(sentence: string, word: string) {
  const w = word.toLowerCase();
  const stem = w.length > 5 ? w.slice(0, w.length - 3) : w;
  return sentence.split(/(\p{L}+)/u).map((part) => {
    const p = part.toLowerCase();
    return { part, hit: p === w || (stem.length >= 3 && stem !== w && p.startsWith(stem)) };
  });
}

export function WordCard({ word }: { word: Word }) {
  const s = useStyles();
  return (
    <View style={s.card}>
      {(!!word.topic || !!word.pos) && (
        <View style={s.tags}>
          {!!word.topic && <Text style={s.tag}>{word.topic}</Text>}
          {!!word.pos && <Text style={s.pos}>{word.pos}</Text>}
        </View>
      )}
      <View style={s.row}>
        <View style={{ flexShrink: 1 }}>
          <Text style={s.it}>{word.it}</Text>
          {!!word.ipa && <Text style={s.ipa}>{word.ipa}</Text>}
        </View>
        <SpeakButton text={word.it} size={26} look="solid" />
      </View>
      <View style={s.divider} />
      <Text style={s.en}>{word.en}</Text>
      {word.alt.length > 0 && <Text style={s.alt}>also: {word.alt.join(', ')}</Text>}

      {word.examples.length > 0 && (
        <View style={s.examples}>
          {word.examples.map((ex) => (
            <View key={ex.it} style={s.example}>
              <View style={{ flex: 1 }}>
                <Text style={s.exIt}>
                  {highlight(ex.it, word.it).map(({ part, hit }, i) => (
                    <Text key={i} style={hit ? s.hit : undefined}>
                      {part}
                    </Text>
                  ))}
                </Text>
                <Text style={s.exEn}>{ex.en}</Text>
              </View>
              <SpeakButton text={ex.it} size={20} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: { backgroundColor: c.card, borderRadius: 28, paddingHorizontal: 22, paddingTop: 22, paddingBottom: 18, borderWidth: 1, borderColor: c.border },
  tags: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 22 },
  tag: { ...F.semibold, fontSize: 13, color: c.accent.purple.text, backgroundColor: c.accent.purple.soft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  pos: { ...F.regular, fontSize: 13, color: c.muted, fontStyle: 'italic', marginLeft: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  it: { ...F.bold, fontSize: 40, lineHeight: 44, letterSpacing: -0.8, color: c.text },
  ipa: { ...F.regular, fontSize: 17, color: c.muted, marginTop: 4 },
  divider: { height: 1, backgroundColor: c.border, marginTop: 20, marginBottom: 18 },
  en: { ...F.semibold, fontSize: 26, letterSpacing: -0.26, color: c.text },
  alt: { ...F.regular, fontSize: 15, color: c.muted, marginTop: 4 },
  examples: { marginTop: 20, gap: 8 },
  example: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.surface, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14 },
  exIt: { ...F.regular, fontSize: 16, color: c.text },
  hit: { ...F.bold, color: c.accent.purple.text },
  exEn: { ...F.regular, fontSize: 14, color: c.muted, marginTop: 2 },
}));
