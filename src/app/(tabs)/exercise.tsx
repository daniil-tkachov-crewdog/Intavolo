import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C, shadow } from '../../lib/theme';

type Item = { title: string; icon: ComponentProps<typeof Ionicons>['name']; href?: Href };

const ITEMS: Item[] = [
  { title: 'Test your vocabulary', icon: 'albums', href: '/vocab-test' },
  { title: 'Learn new words', icon: 'sparkles' },
  { title: 'Sentences', icon: 'chatbubbles' },
  { title: 'Grammar test', icon: 'book' },
];

export default function ExerciseMenu() {
  return (
    <View style={s.wrap}>
      <View style={s.grid}>
        {ITEMS.map(({ title, icon, href }) => {
          const soon = !href;
          return (
            <Pressable
              key={title}
              disabled={soon}
              onPress={() => href && router.push(href)}
              accessibilityRole="button"
              accessibilityState={{ disabled: soon }}
              style={({ pressed }) => [s.tile, soon && s.soon, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name={icon} size={34} color={soon ? C.hint : C.primary} />
              <Text style={[s.title, soon && { color: C.muted }]}>{title}</Text>
              {soon && <Text style={s.badge}>Coming soon</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, width: '100%', maxWidth: 360, justifyContent: 'center' },
  tile: {
    width: '46%',
    aspectRatio: 1,
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 10,
    ...shadow,
  },
  soon: { shadowOpacity: 0, backgroundColor: C.bg },
  title: { fontSize: 15, fontWeight: '700', color: C.text, textAlign: 'center' },
  badge: { fontSize: 11, fontWeight: '600', color: C.warn, borderWidth: 1, borderColor: C.warn, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
});
