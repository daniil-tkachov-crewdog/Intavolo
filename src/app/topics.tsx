import { useDeferredValue, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../lib/store';
import { LEVELS, TOPICS, WORDS, WORD_BY_ID } from '../lib/vocab';
import { searchWords } from '../lib/search';
import { BelowHeader } from '../components/BelowHeader';
import { WordRow } from '../components/WordRow';
import { C } from '../lib/theme';

export default function Topics() {
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
      <Ionicons name="search" size={18} color={C.muted} />
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search Italian or English"
        placeholderTextColor={C.muted}
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

  return (
    <BelowHeader>
      {searchBar}
      <FlatList
        data={ROWS}
        keyExtractor={(t) => t.name}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/topic/[name]', params: { name: item.name } })}
            style={[s.topic, item.level && s.level]}
          >
            {item.level ? (
              <>
                <View style={s.badge}>
                  <Text style={s.badgeText}>{item.name}</Text>
                </View>
                <Text style={s.topicName}>{LEVEL_LABEL[item.name]}</Text>
              </>
            ) : (
              <Text style={s.topicName}>{item.name}</Text>
            )}
            <Text style={s.topicCount}>
              {added.get(item.name) ?? 0} / {item.count}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={C.muted} />
          </Pressable>
        )}
      />
    </BelowHeader>
  );
}

const LEVEL_LABEL: Record<string, string> = {
  A1: 'Beginner',
  A2: 'Elementary',
  B1: 'Intermediate',
  B2: 'Upper intermediate',
  C1: 'Advanced',
  C2: 'Proficient',
};

/** Fixed CEFR level rows first, then regular topics. */
const ROWS = [...LEVELS.map((l) => ({ ...l, level: true })), ...TOPICS.map((t) => ({ ...t, level: false }))];

const s = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 16, marginBottom: 4, paddingHorizontal: 12, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: C.text },
  list: { padding: 16, gap: 8 },
  topic: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border },
  level: { backgroundColor: '#EAF4EE', borderColor: C.primary },
  badge: { backgroundColor: C.primary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  topicName: { flex: 1, fontSize: 16, fontWeight: '600', color: C.text },
  topicCount: { fontSize: 13, color: C.muted },
  empty: { textAlign: 'center', color: C.muted, marginTop: 40 },
});
