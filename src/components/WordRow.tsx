import { memo, useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Word } from '../lib/vocab';
import { STATUS_LABEL, type Status } from '../lib/engine';
import { SpeakButton } from './WordCard';
import { StatusDropdown } from './StatusDropdown';
import { C, STATUS_COLOR } from '../lib/theme';

interface Props {
  word: Word;
  status?: Status; // set when the word is already in the user's vocabulary
  onAdd: (wordId: number, status: Status) => void;
}

/** One word in Topics / Search lists, with Learn and Already Know. */
export const WordRow = memo(function WordRow({ word, status, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const add = (st: Status) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(false);
    onAdd(word.id, st);
  };

  return (
    <View style={s.row}>
      <View style={s.top}>
        <View style={{ flex: 1 }}>
          <Text style={s.it}>{word.it}</Text>
          <Text style={s.en} numberOfLines={1}>
            {word.en}
            {word.alt.length > 0 && <Text style={s.alt}>{'  ·  ' + word.alt.join(', ')}</Text>}
          </Text>
        </View>
        <SpeakButton text={word.it} size={18} />
        {status ? (
          <Text style={[s.status, { color: STATUS_COLOR[status] }]}>{STATUS_LABEL[status]}</Text>
        ) : (
          <View style={s.actions}>
            <Pressable onPress={() => add('new')} style={[s.btn, { backgroundColor: C.primary }]}>
              <Text style={[s.btnText, { color: '#fff' }]}>Learn</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setOpen((o) => !o);
              }}
              style={[s.btn, { borderColor: C.primary, borderWidth: 1.5 }]}
            >
              <Text style={[s.btnText, { color: C.primary }]}>Know</Text>
            </Pressable>
          </View>
        )}
      </View>
      {open && !status && <StatusDropdown onPick={add} />}
    </View>
  );
});

const s = StyleSheet.create({
  row: { backgroundColor: C.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border },
  top: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  it: { fontSize: 17, fontWeight: '600', color: C.text },
  en: { fontSize: 14, color: C.text, marginTop: 2 },
  alt: { color: C.muted },
  status: { fontSize: 13, fontWeight: '600', paddingHorizontal: 6 },
  actions: { flexDirection: 'row', gap: 6 },
  btn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
  btnText: { fontSize: 13, fontWeight: '600' },
});
