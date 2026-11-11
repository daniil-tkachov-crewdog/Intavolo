import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Word } from '../lib/vocab';
import { useStore } from '../lib/store';
import { C, shadow } from '../lib/theme';

export function SpeakButton({ text, size = 22 }: { text: string; size?: number }) {
  const { speak } = useStore();
  return (
    <Pressable onPress={() => speak(text)} hitSlop={10} style={({ pressed }) => [s.speak, pressed && { opacity: 0.5 }]}>
      <Ionicons name="volume-high" size={size} color={C.primary} />
    </Pressable>
  );
}

export function WordCard({ word }: { word: Word }) {
  return (
    <View style={s.card}>
      <View style={s.row}>
        <Text style={s.it}>{word.it}</Text>
        <SpeakButton text={word.it} size={26} />
      </View>
      {!!word.ipa && <Text style={s.ipa}>{word.ipa}</Text>}
      <Text style={s.en}>{word.en}</Text>
      {word.alt.length > 0 && <Text style={s.alt}>also: {word.alt.join(', ')}</Text>}
      <View style={s.tags}>
        {!!word.topic && <Text style={s.tag}>{word.topic}</Text>}
        {!!word.pos && <Text style={s.pos}>{word.pos}</Text>}
      </View>

      {word.examples.length > 0 && (
        <View style={s.examples}>
          {word.examples.map((ex) => (
            <View key={ex.it} style={s.example}>
              <View style={{ flex: 1 }}>
                <Text style={s.exIt}>{ex.it}</Text>
                <Text style={s.exEn}>{ex.en}</Text>
              </View>
              <SpeakButton text={ex.it} size={18} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 24, padding: 24, ...shadow },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  it: { fontSize: 38, fontWeight: '700', color: C.text, flexShrink: 1 },
  speak: { padding: 6 },
  ipa: { fontSize: 17, color: C.muted, marginTop: 4 },
  en: { fontSize: 22, color: C.text, marginTop: 16 },
  alt: { fontSize: 15, color: C.muted, marginTop: 4 },
  tags: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  tag: { fontSize: 12, color: C.primary, backgroundColor: C.primary + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
  pos: { fontSize: 13, color: C.muted, fontStyle: 'italic' },
  examples: { marginTop: 20, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12, gap: 12 },
  example: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exIt: { fontSize: 16, color: C.text },
  exEn: { fontSize: 14, color: C.muted, marginTop: 2 },
});
