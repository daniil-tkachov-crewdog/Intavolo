import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BelowHeader } from '../components/BelowHeader';
import { Rich } from '../components/Rich';
import { GRAMMAR_LEVELS, LESSONS, PASS, bestScore } from '../lib/grammar';
import { F, makeStyles, useTheme } from '../lib/theme';

const LEVEL_LABEL = { A1: 'Beginner', A2: 'Elementary', B1: 'Intermediate', B2: 'Upper intermediate' } as const;

export default function Grammar() {
  const s = useStyles();
  const { c } = useTheme();
  const [scores, setScores] = useState<Map<string, number | null>>(new Map());

  // Re-read scores whenever we come back from a lesson.
  useFocusEffect(useCallback(() => setScores(new Map(LESSONS.map((l) => [l.id, bestScore(l.id)]))), []));

  const done = LESSONS.filter((l) => (scores.get(l.id) ?? 0) >= PASS).length;

  return (
    <BelowHeader>
      <ScrollView contentContainerStyle={s.wrap}>
        <Text style={s.progress}>
          {done} of {LESSONS.length} lessons done
        </Text>
        {GRAMMAR_LEVELS.map((level) => (
          <View key={level} style={{ gap: 10 }}>
            <Text style={s.level}>
              {level} · {LEVEL_LABEL[level]}
            </Text>
            {LESSONS.filter((l) => l.level === level).map((l) => {
              const score = scores.get(l.id) ?? null;
              const passed = score !== null && score >= PASS;
              return (
                <Pressable
                  key={l.id}
                  onPress={() => router.push({ pathname: '/grammar/[id]', params: { id: l.id } })}
                  accessibilityRole="button"
                  style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}
                >
                  <View style={{ flex: 1, gap: 3 }}>
                    <Rich text={l.title} style={s.title} />
                    <Rich text={l.summary} style={s.summary} />
                  </View>
                  {passed ? (
                    <Ionicons name="checkmark-circle" size={24} color={c.accent.green.fg} />
                  ) : score !== null ? (
                    <Text style={s.score}>{Math.round(score * 100)}%</Text>
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color={c.muted} />
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </BelowHeader>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { paddingHorizontal: 16, paddingBottom: 30, gap: 22 },
  progress: { ...F.medium, fontSize: 15, color: c.muted },
  level: { ...F.bold, fontSize: 20, color: c.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.card, borderRadius: 20, borderWidth: 1, borderColor: c.border, padding: 16 },
  title: { ...F.semibold, fontSize: 16, color: c.text },
  summary: { ...F.regular, fontSize: 14, color: c.muted },
  score: { ...F.semibold, fontSize: 14, color: c.accent.amber.text },
}));
