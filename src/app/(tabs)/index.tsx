import { useMemo, useRef, useState } from 'react';
import { Animated, LayoutAnimation, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../../lib/store';
import { WORDS } from '../../lib/vocab';
import type { Status } from '../../lib/engine';
import { WordCard } from '../../components/WordCard';
import { StatusDropdown } from '../../components/StatusDropdown';
import { Button } from '../../components/Button';
import { C } from '../../lib/theme';

export default function Explore() {
  const { progress, skipped, addWord, skipWord } = useStore();
  const [open, setOpen] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;

  // Unseen words by frequency; skipped ones go to the back of the feed.
  const feed = useMemo(
    () =>
      WORDS.filter((w) => !progress.has(w.id)).sort(
        (a, b) => (skipped.get(a.id) ?? 0) - (skipped.get(b.id) ?? 0) || a.rank - b.rank
      ),
    [progress, skipped]
  );
  const word = feed[0];

  const next = (action: () => void) => {
    Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      action();
      setOpen(false);
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  if (!word) {
    return (
      <View style={s.empty}>
        <Text style={s.emptyTitle}>You have seen every word 🎉</Text>
        <Text style={s.emptyText}>Head to Practice to keep learning.</Text>
      </View>
    );
  }

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Animated.View style={{ opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
        <WordCard word={word} />
      </Animated.View>

      <View style={s.buttons}>
        <Button label="Learn" onPress={() => next(() => addWord(word.id, 'new'))} />
        <Button label="Already Know" outline onPress={toggle} />
        <Button label="Skip" outline color={C.muted} onPress={() => next(() => skipWord(word.id))} />
      </View>
      {open && <StatusDropdown onPick={(st: Status) => next(() => addWord(word.id, st))} />}

      <Text style={s.left}>{feed.length} words to explore</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40 },
  buttons: { flexDirection: 'row', gap: 8, marginTop: 16 },
  left: { textAlign: 'center', color: C.muted, marginTop: 20, fontSize: 13 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: C.text },
  emptyText: { fontSize: 16, color: C.muted, marginTop: 8 },
});
