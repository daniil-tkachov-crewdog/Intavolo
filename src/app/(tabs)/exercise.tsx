import type { ComponentProps } from 'react';
import { Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { SCALE, Text } from '../../components/Text';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { IconTile } from '../../components/IconTile';
import { F, makeStyles, type Accent } from '../../lib/theme';

type Item = { title: string; icon: ComponentProps<typeof Ionicons>['name']; accent: Accent; href?: Href };

const ITEMS: Item[] = [
  { title: 'Test your vocabulary', icon: 'albums', accent: 'purple', href: '/vocab-test' },
  { title: 'Learn new words', icon: 'sparkles', accent: 'blue', href: '/learn' },
  { title: 'Sentences', icon: 'chatbubbles', accent: 'amber', href: '/sentences' },
  { title: 'Grammar', icon: 'book', accent: 'red', href: '/grammar' },
];

export default function ExerciseMenu() {
  const s = useStyles();
  // Square tiles (equal width; may grow taller at large text sizes).
  const { width } = useWindowDimensions();
  const gap = width < 360 ? 10 : 12;
  const size = Math.floor((Math.min(width, 520) - 16 * 2 - gap) / 2);
  return (
    <ScrollView contentContainerStyle={[s.grid, { gap }]}>
      {ITEMS.map(({ title, icon, accent, href }) => {
        const soon = !href;
        return (
          <Pressable
            key={title}
            disabled={soon}
            onPress={() => href && router.push(href)}
            accessibilityRole="button"
            accessibilityState={{ disabled: soon }}
            style={({ pressed }) => [s.tile, { width: size, minHeight: size }, pressed && { opacity: 0.7 }]}
          >
            <IconTile icon={icon} accent={accent} size={48} />
            <Text style={s.title} maxFontSizeMultiplier={SCALE.ui}>
              {title}
            </Text>
            {soon && <Text maxFontSizeMultiplier={SCALE.ui} style={s.badge}>Coming soon</Text>}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const useStyles = makeStyles((c) => ({
  grid: { flexGrow: 1, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingBottom: 24 },
  tile: { backgroundColor: c.card, borderRadius: 24, borderWidth: 1, borderColor: c.border, padding: 16, gap: 12, alignItems: 'center', justifyContent: 'center' },
  title: { ...F.semibold, fontSize: 17, color: c.text, textAlign: 'center' },
  badge: { ...F.semibold, fontSize: 12, color: c.accent.amber.text, backgroundColor: c.accent.amber.soft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, overflow: 'hidden' },
}));
