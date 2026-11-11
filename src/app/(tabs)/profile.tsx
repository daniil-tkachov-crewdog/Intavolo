import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore, SPEECH_RATES, type SpeechRate } from '../../lib/store';
import { STATUSES, STATUS_LABEL } from '../../lib/engine';
import { WORDS } from '../../lib/vocab';
import { C, STATUS_COLOR } from '../../lib/theme';

export default function Profile() {
  const { progress, speechRate, setSpeechRate } = useStore();
  const counts = Object.fromEntries(STATUSES.map((st) => [st, 0])) as Record<string, number>;
  for (const p of progress.values()) counts[p.status]++;

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Section title="Stats">
        <View style={s.stats}>
          {STATUSES.map((st) => (
            <View key={st} style={s.stat}>
              <Text style={[s.statNum, { color: STATUS_COLOR[st] }]}>{counts[st]}</Text>
              <Text style={s.statLabel}>{STATUS_LABEL[st]}</Text>
            </View>
          ))}
        </View>
        <Text style={s.small}>
          {progress.size} of {WORDS.length} words added
        </Text>
      </Section>

      <Section title="Vocabulary">
        <Link href="/vocabulary" asChild>
          <Pressable style={s.row}>
            <Text style={s.rowText}>My words</Text>
            <Ionicons name="chevron-forward" size={18} color={C.muted} />
          </Pressable>
        </Link>
      </Section>

      <Section title="Settings">
        <Text style={s.rowText}>Speech speed</Text>
        <View style={s.chips}>
          {(Object.keys(SPEECH_RATES) as SpeechRate[]).map((r) => (
            <Pressable key={r} onPress={() => setSpeechRate(r)} style={[s.chip, speechRate === r && s.chipOn]}>
              <Text style={[s.chipText, speechRate === r && { color: '#fff' }]}>{r}</Text>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title="Account">
        <Text style={s.soon}>Coming soon</Text>
      </Section>
      <Section title="Payment">
        <Text style={s.soon}>Coming soon</Text>
      </Section>

      <Section title="Credits">
        <Text style={s.small}>
          Dictionary data from Wiktionary via kaikki.org (CC BY-SA 4.0). Word frequency from FrequencyWords by Hermit
          Dave (CC BY-SA 4.0). Example sentences from Tatoeba (CC BY 2.0 FR). Audio by iOS text-to-speech.
        </Text>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.title}>{title}</Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, gap: 14, paddingBottom: 40 },
  section: { backgroundColor: C.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border },
  title: { fontSize: 13, fontWeight: '700', color: C.muted, textTransform: 'uppercase', marginBottom: 10 },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1 },
  statNum: { fontSize: 26, fontWeight: '700' },
  statLabel: { fontSize: 12, color: C.muted, marginTop: 2 },
  small: { fontSize: 13, color: C.muted, marginTop: 10, lineHeight: 19 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  rowText: { fontSize: 16, color: C.text },
  chips: { flexDirection: 'row', gap: 8, marginTop: 10 },
  chip: { flex: 1, borderWidth: 1.5, borderColor: C.primary, borderRadius: 12, paddingVertical: 8, alignItems: 'center' },
  chipOn: { backgroundColor: C.primary },
  chipText: { color: C.primary, fontWeight: '600' },
  soon: { color: C.muted, fontSize: 15 },
});
