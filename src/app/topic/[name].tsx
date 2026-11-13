import { useMemo } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useStore } from '../../lib/store';
import { WORDS, isLevel } from '../../lib/vocab';
import { BelowHeader } from '../../components/BelowHeader';
import { WordRow } from '../../components/WordRow';
import { Button } from '../../components/Button';
import { F, makeStyles } from '../../lib/theme';

export default function Topic() {
  const s = useStyles();
  const { name } = useLocalSearchParams<{ name: string }>();
  const { progress, addWord, addWords } = useStore();
  const words = useMemo(() => WORDS.filter((w) => (isLevel(name) ? w.level === name : w.topic === name)), [name]);
  const remaining = words.filter((w) => !progress.has(w.id));

  const learnAll = () =>
    Alert.alert(`Learn all ${remaining.length} words?`, `They will be added to Practice as New.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Learn all', onPress: () => addWords(remaining.map((w) => w.id), 'new') },
    ]);

  return (
    <BelowHeader>
      <Stack.Screen options={{ title: name }} />
      <FlatList
        data={words}
        keyExtractor={(w) => String(w.id)}
        contentContainerStyle={s.list}
        initialNumToRender={20}
        ListHeaderComponent={
          <View style={s.header}>
            <Text style={s.count}>
              {words.length - remaining.length} of {words.length} added
            </Text>
            {remaining.length > 0 && (
              <View style={{ flexDirection: 'row' }}>
                <Button label={`Learn all (${remaining.length})`} icon="add" onPress={learnAll} />
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => <WordRow word={item} status={progress.get(item.id)?.status} onAdd={addWord} />}
      />
    </BelowHeader>
  );
}

const useStyles = makeStyles((c) => ({
  list: { padding: 16, paddingTop: 4, gap: 8 },
  header: { gap: 12, marginBottom: 6 },
  count: { ...F.regular, color: c.muted, fontSize: 14, marginHorizontal: 4 },
}));
