import { Fragment, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore, SPEECH_RATES, type SpeechRate } from '../../lib/store';
import { STATUSES, STATUS_LABEL } from '../../lib/engine';
import { WORDS } from '../../lib/vocab';
import { IconTile } from '../../components/IconTile';
import { F, makeStyles, useTheme, type ThemeMode } from '../../lib/theme';

const APPEARANCE: { mode: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { mode: 'light', label: 'Light', icon: 'sunny' },
  { mode: 'dark', label: 'Dark', icon: 'moon' },
  { mode: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

const fmt = (n: number) => n.toLocaleString('en-US');

export default function Profile() {
  const s = useStyles();
  const { c, mode, setMode } = useTheme();
  const { progress, speechRate, setSpeechRate } = useStore();
  const counts = Object.fromEntries(STATUSES.map((st) => [st, 0])) as Record<string, number>;
  for (const p of progress.values()) counts[p.status]++;

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <View style={[s.card, s.stats]}>
        <View style={s.total}>
          <Text style={s.totalNum}>{fmt(progress.size)}</Text>
          <Text style={s.totalText}>of {fmt(WORDS.length)} words added</Text>
        </View>
        <View style={s.bar}>
          {progress.size === 0 ? (
            <View style={{ flex: 1, backgroundColor: c.surface }} />
          ) : (
            STATUSES.map((st) => counts[st] > 0 && <View key={st} style={{ flex: counts[st], backgroundColor: c.status[st].fg }} />)
          )}
        </View>
        <View style={s.statRow}>
          {STATUSES.map((st) => (
            <View key={st} style={{ flex: 1 }}>
              <Text style={[s.statNum, { color: c.status[st].fg }]}>{fmt(counts[st])}</Text>
              <Text style={s.statLabel}>{STATUS_LABEL[st]}</Text>
            </View>
          ))}
        </View>
      </View>

      <Link href="/vocabulary" asChild>
        <Pressable style={({ pressed }) => [s.card, s.link, pressed && { opacity: 0.7 }]}>
          <IconTile icon="bookmarks" accent="purple" />
          <Text style={s.linkText}>My words</Text>
          <Ionicons name="chevron-forward" size={16} color={c.muted} />
        </Pressable>
      </Link>

      <View style={[s.card, s.settings]}>
        <Setting title="Speech speed">
          {(Object.keys(SPEECH_RATES) as SpeechRate[]).map((r) => {
            const on = speechRate === r;
            return (
              <Pressable key={r} onPress={() => setSpeechRate(r)} style={[s.seg, on && { backgroundColor: c.primary }]}>
                <Text style={[s.segText, on && { ...F.semibold, color: '#FFFFFF' }]}>{r}</Text>
              </Pressable>
            );
          })}
        </Setting>
        <Setting title="Appearance">
          {APPEARANCE.map((a) => {
            const on = mode === a.mode;
            const color = on ? c.accent.purple.text : c.muted;
            return (
              <Pressable key={a.mode} onPress={() => setMode(a.mode)} style={[s.seg, on && { backgroundColor: c.card }]}>
                <Ionicons name={a.icon} size={a.mode === 'light' ? 15 : 14} color={color} />
                <Text style={[s.segText, { color }, on && F.semibold]}>{a.label}</Text>
              </Pressable>
            );
          })}
        </Setting>
      </View>

      <View style={[s.card, s.list]}>
        {['Account', 'Payment'].map((t) => (
          <Fragment key={t}>
            <View style={s.item}>
              <Text style={s.itemText}>{t}</Text>
              <Text style={s.soon}>Coming soon</Text>
            </View>
            <View style={s.sep} />
          </Fragment>
        ))}
        <View style={s.credits}>
          <Text style={s.creditsTitle}>Credits</Text>
          <Text style={s.small}>
            Dictionary data from Wiktionary via kaikki.org (CC BY-SA 4.0). Word frequency from FrequencyWords by Hermit Dave (CC BY-SA 4.0).
            Example sentences from Tatoeba (CC BY 2.0 FR). Audio by iOS text-to-speech.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function Setting({ title, children }: { title: string; children: ReactNode }) {
  const s = useStyles();
  return (
    <View style={{ gap: 10 }}>
      <Text style={s.settingTitle}>{title}</Text>
      <View style={s.segments}>{children}</View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { paddingHorizontal: 16, paddingBottom: 24, gap: 8 },
  card: { backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 22 },
  stats: { borderRadius: 26, padding: 16, gap: 12 },
  total: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  totalNum: { ...F.bold, fontSize: 36, letterSpacing: -0.72, color: c.text },
  totalText: { ...F.regular, fontSize: 15, color: c.muted },
  bar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 3 },
  statRow: { flexDirection: 'row', gap: 6 },
  statNum: { ...F.bold, fontSize: 22 },
  statLabel: { ...F.regular, fontSize: 12, color: c.muted },
  link: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  linkText: { ...F.semibold, flex: 1, fontSize: 16, color: c.text },
  settings: { padding: 14, gap: 12 },
  settingTitle: { ...F.semibold, fontSize: 15, color: c.text },
  segments: { flexDirection: 'row', backgroundColor: c.surface, borderRadius: 12, padding: 3, gap: 3 },
  seg: { flex: 1, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 10 },
  segText: { ...F.medium, fontSize: 14, color: c.muted },
  list: { paddingVertical: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 16 },
  itemText: { ...F.regular, flex: 1, fontSize: 16, color: c.text },
  soon: { ...F.regular, fontSize: 13, color: c.muted },
  sep: { height: 1, backgroundColor: c.border, marginLeft: 16 },
  creditsTitle: { ...F.regular, fontSize: 16, color: c.text },
  credits: { paddingVertical: 10, paddingHorizontal: 16, gap: 4 },
  small: { ...F.regular, fontSize: 12, lineHeight: 18, color: c.muted },
}));
