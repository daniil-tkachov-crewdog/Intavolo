import type { ComponentProps } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { IconTile } from '../../components/IconTile';
import { F, makeStyles, type Accent } from '../../lib/theme';

type Item = { title: string; icon: ComponentProps<typeof Ionicons>['name']; accent: Accent; href?: Href };

const ITEMS: Item[] = [
  { title: 'Test your vocabulary', icon: 'albums', accent: 'purple', href: '/vocab-test' },
  { title: 'Learn new words', icon: 'sparkles', accent: 'blue', href: '/learn' },
  { title: 'Sentences', icon: 'chatbubbles', accent: 'amber' },
  { title: 'Grammar test', icon: 'book', accent: 'red' },
];

export default function ExerciseMenu() {
  const s = useStyles();
  return (
    <ScrollView contentContainerStyle={s.grid}>
      {ITEMS.map(({ title, icon, accent, href }) => {
        const soon = !href;
        return (
          <Pressable
            key={title}
            disabled={soon}
            onPress={() => href && router.push(href)}
            accessibilityRole="button"
            accessibilityState={{ disabled: soon }}
            style={({ pressed }) => [s.tile, pressed && { opacity: 0.7 }]}
          >
            <IconTile icon={icon} accent={accent} size={48} />
            <Text style={s.title}>{title}</Text>
            {soon && <Text style={s.badge}>Coming soon</Text>}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const useStyles = makeStyles((c) => ({
  grid: { flexGrow: 1, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 24 },
  tile: { flexBasis: '45%', flexGrow: 1, minHeight: 150, backgroundColor: c.card, borderRadius: 24, borderWidth: 1, borderColor: c.border, padding: 18, gap: 14 },
  title: { ...F.semibold, fontSize: 17, color: c.text },
  badge: { ...F.semibold, fontSize: 12, color: c.accent.amber.text, backgroundColor: c.accent.amber.soft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start', overflow: 'hidden' },
}));
