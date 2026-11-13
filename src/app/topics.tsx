import { useDeferredValue, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../lib/store';
import { LEVELS, TOPICS, WORDS, WORD_BY_ID } from '../lib/vocab';
import { searchWords } from '../lib/search';
import { BelowHeader } from '../components/BelowHeader';
import { WordRow } from '../components/WordRow';
import { IconTile } from '../components/IconTile';
import { F, makeStyles, useTheme, type Accent } from '../lib/theme';

const open = (name: string) => router.push({ pathname: '/topic/[name]', params: { name } });
const fmt = (n: number) => n.toLocaleString('en-US');

export default function Topics() {
  const s = useStyles();
  const { c } = useTheme();
  const { progress, addWord } = useStore();
  const [query, setQuery] = useState('');
  const q = useDeferredValue(query);
  const results = useMemo(() => searchWords(WORDS, q), [q]);

  const added = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of progress.values()) {
      const w = WORD_BY_ID.get(p.wordId);
      for (const k of [w?.topic, w?.level]) if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [progress]);

  const searchBar = (
    <View style={s.search}>
      <Ionicons name="search" size={18} color={c.muted} />
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search Italian or English"
        placeholderTextColor={c.muted}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        style={s.input}
      />
    </View>
  );

  if (q.trim()) {
    return (
      <BelowHeader>
        {searchBar}
        <FlatList
          data={results}
          keyExtractor={(w) => String(w.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.list}
          ListEmptyComponent={<Text style={s.empty}>No words found.</Text>}
          renderItem={({ item }) => <WordRow word={item} status={progress.get(item.id)?.status} onAdd={addWord} />}
        />
      </BelowHeader>
    );
  }

  // The first level that still has words to add is highlighted.
  const current = LEVELS.find((l) => (added.get(l.name) ?? 0) < l.count)?.name;

  const levels = (
    <View style={{ gap: 14, marginBottom: 14 }}>
      <Text style={s.label}>Levels</Text>
      <View style={s.levels}>
        {LEVELS.map((l) => {
          const n = added.get(l.name) ?? 0;
          const on = l.name === current;
          return (
            <Pressable key={l.name} onPress={() => open(l.name)} style={({ pressed }) => [s.level, on && s.levelOn, pressed && { opacity: 0.7 }]}>
              <Text style={[s.levelName, on && { color: '#FFFFFF' }]}>{l.name}</Text>
              <Text style={[s.levelLabel, on && { color: '#FFFFFF', opacity: 0.85 }]}>{LEVEL_LABEL[l.name]}</Text>
              <Text style={[s.levelCount, { color: on ? '#FFFFFF' : n > 0 ? c.accent.purple.text : c.muted }]}>
                {fmt(n)} / {fmt(l.count)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={s.label}>Topics</Text>
    </View>
  );

  return (
    <BelowHeader>
      {searchBar}
      <FlatList
        data={TOPICS}
        keyExtractor={(t) => t.name}
        contentContainerStyle={s.listTopics}
        ListHeaderComponent={levels}
        renderItem={({ item, index }) => {
          const [icon, accent] = TOPIC_ICON[item.name] ?? DEFAULT_ICON;
          const first = index === 0;
          const last = index === TOPICS.length - 1;
          return (
            <View style={[s.group, first && s.groupFirst, last && s.groupLast]}>
              {!first && <View style={s.sep} />}
              <Pressable onPress={() => open(item.name)} style={({ pressed }) => [s.topic, pressed && { opacity: 0.6 }]}>
                <IconTile icon={icon} accent={accent} />
                <Text style={s.topicName}>{item.name}</Text>
                <Text style={s.topicCount}>
                  {fmt(added.get(item.name) ?? 0)} / {fmt(item.count)}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={c.muted} />
              </Pressable>
            </View>
          );
        }}
      />
    </BelowHeader>
  );
}

const LEVEL_LABEL: Record<string, string> = {
  A1: 'Beginner',
  A2: 'Elementary',
  B1: 'Intermediate',
  B2: 'Upper interm.',
  C1: 'Advanced',
  C2: 'Proficient',
};

type Icon = keyof typeof Ionicons.glyphMap;
const DEFAULT_ICON: [Icon, Accent] = ['pricetag', 'purple'];
const TOPIC_ICON: Record<string, [Icon, Accent]> = {
  Actions: ['flash', 'amber'],
  Animals: ['paw', 'green'],
  Basics: ['apps', 'purple'],
  'Body & Health': ['body', 'red'],
  Communication: ['chatbubbles', 'blue'],
  Descriptions: ['color-palette', 'purple'],
  Events: ['calendar', 'red'],
  Feelings: ['heart', 'red'],
  'Food & Drink': ['restaurant', 'amber'],
  'Home & Objects': ['home', 'teal'],
  'Life & Situations': ['sunny', 'amber'],
  'Mind & Ideas': ['bulb', 'amber'],
  'Money & Shopping': ['cart', 'green'],
  Nature: ['leaf', 'green'],
  'Numbers & Quantity': ['calculator', 'blue'],
  'People & Society': ['people', 'teal'],
  'Places & Travel': ['airplane', 'blue'],
  'Sports & Games': ['football', 'green'],
  Time: ['time', 'purple'],
  Other: ['ellipsis-horizontal', 'grey'],
};

const useStyles = makeStyles((c) => ({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, marginHorizontal: 16, marginBottom: 2, paddingHorizontal: 14, backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.border },
  input: { ...F.regular, flex: 1, fontSize: 16, color: c.text, paddingVertical: 0 },
  list: { padding: 16, paddingTop: 12, gap: 8 },
  listTopics: { padding: 16, paddingTop: 12 },
  label: { ...F.semibold, fontSize: 13, letterSpacing: 0.78, textTransform: 'uppercase', color: c.muted, marginHorizontal: 4, marginTop: 4, marginBottom: -4 },
  levels: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  level: { flexBasis: '30%', flexGrow: 1, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 12 },
  levelOn: { backgroundColor: c.primary, borderColor: c.primary },
  levelName: { ...F.bold, fontSize: 20, color: c.text },
  levelLabel: { ...F.regular, fontSize: 12, color: c.muted, marginTop: 2 },
  levelCount: { ...F.semibold, fontSize: 12, marginTop: 8 },
  group: { backgroundColor: c.card, borderLeftWidth: 1, borderRightWidth: 1, borderColor: c.border },
  groupFirst: { borderTopWidth: 1, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 4 },
  groupLast: { borderBottomWidth: 1, borderBottomLeftRadius: 22, borderBottomRightRadius: 22, paddingBottom: 4 },
  sep: { height: 1, backgroundColor: c.border, marginLeft: 62 },
  topic: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14 },
  topicName: { ...F.semibold, flex: 1, fontSize: 16, color: c.text },
  topicCount: { ...F.regular, fontSize: 13, color: c.muted },
  empty: { ...F.regular, textAlign: 'center', color: c.muted, marginTop: 40 },
}));
