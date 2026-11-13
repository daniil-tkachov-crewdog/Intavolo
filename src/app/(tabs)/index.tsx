import { useMemo, useRef, useState } from 'react';
import { Animated, LayoutAnimation, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../lib/store';
import { WORDS, SHUFFLE_KEY } from '../../lib/vocab';
import type { Status } from '../../lib/engine';
import { WordCard } from '../../components/WordCard';
import { StatusDropdown } from '../../components/StatusDropdown';
import { Button } from '../../components/Button';
import { F, makeStyles, useTheme } from '../../lib/theme';

export default function Explore() {
  const s = useStyles();
  const { c } = useTheme();
  const { progress, skipped, addWord, skipWord } = useStore();
  const [open, setOpen] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;

  // Unseen words in random order; skipped ones go to the back of the feed.
  const feed = useMemo(
    () =>
      WORDS.filter((w) => !progress.has(w.id)).sort(
        (a, b) => (skipped.get(a.id) ?? 0) - (skipped.get(b.id) ?? 0) || SHUFFLE_KEY.get(a.id)! - SHUFFLE_KEY.get(b.id)!
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
        <Pressable
          onPress={() => next(() => skipWord(word.id))}
          accessibilityRole="button"
          accessibilityLabel="Skip"
          style={({ pressed }) => [s.skip, pressed && { opacity: 0.55 }]}
        >
          <Ionicons name="play-skip-forward" size={20} color={c.muted} />
        </Pressable>
        <Button label="Already know" variant="success" icon="checkmark-circle" onPress={toggle} />
        <Button label="Learn" icon="add" style={{ flex: 1.2 }} onPress={() => next(() => addWord(word.id, 'new'))} />
      </View>
      {open && <StatusDropdown onPick={(st: Status) => next(() => addWord(word.id, st))} />}

      <Text style={s.left}>{feed.length.toLocaleString('en-US')} words to explore</Text>
    </ScrollView>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { paddingHorizontal: 16, paddingBottom: 40, gap: 14 },
  buttons: { flexDirection: 'row', gap: 8 },
  skip: { width: 54, height: 54, borderRadius: 18, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  left: { ...F.regular, textAlign: 'center', color: c.muted, fontSize: 13 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { ...F.bold, fontSize: 22, color: c.text },
  emptyText: { ...F.regular, fontSize: 16, color: c.muted, marginTop: 8 },
}));
