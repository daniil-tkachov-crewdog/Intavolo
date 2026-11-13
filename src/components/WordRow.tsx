import { memo, useState } from 'react';
import { LayoutAnimation, Pressable, Text, View } from 'react-native';
import type { Word } from '../lib/vocab';
import { STATUS_LABEL, type Status } from '../lib/engine';
import { SpeakButton } from './WordCard';
import { StatusDropdown } from './StatusDropdown';
import { F, makeStyles, useTheme } from '../lib/theme';

interface Props {
  word: Word;
  status?: Status; // set when the word is already in the user's vocabulary
  onAdd: (wordId: number, status: Status) => void;
}

/** One word in Topics / Search lists, with Learn and Already Know. */
export const WordRow = memo(function WordRow({ word, status, onAdd }: Props) {
  const s = useStyles();
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const add = (st: Status) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(false);
    onAdd(word.id, st);
  };

  return (
    <View style={{ gap: 8 }}>
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Text style={s.it}>{word.it}</Text>
          <Text style={s.en} numberOfLines={1}>
            {word.en}
            {word.alt.length > 0 && <Text style={s.alt}>{'  ·  ' + word.alt.join(', ')}</Text>}
          </Text>
        </View>
        <SpeakButton text={word.it} size={18} />
        {status ? (
          <Text style={[s.status, { color: c.status[status].text, backgroundColor: c.status[status].soft }]}>{STATUS_LABEL[status]}</Text>
        ) : (
          <View style={s.actions}>
            <Pressable
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setOpen((o) => !o);
              }}
              style={[s.btn, { backgroundColor: c.accent.green.soft }]}
            >
              <Text style={[s.btnText, { color: c.accent.green.text }]}>Know</Text>
            </Pressable>
            <Pressable onPress={() => add('new')} style={[s.btn, { backgroundColor: c.primary }]}>
              <Text style={[s.btnText, { color: '#FFFFFF' }]}>Learn</Text>
            </Pressable>
          </View>
        )}
      </View>
      {open && !status && <StatusDropdown onPick={add} />}
    </View>
  );
});

const useStyles = makeStyles((c) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.card, borderRadius: 18, paddingVertical: 12, paddingLeft: 14, paddingRight: 10, borderWidth: 1, borderColor: c.border },
  it: { ...F.semibold, fontSize: 17, color: c.text },
  en: { ...F.regular, fontSize: 14, color: c.text, marginTop: 2 },
  alt: { color: c.muted },
  status: { ...F.semibold, fontSize: 12, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  actions: { flexDirection: 'row', gap: 6 },
  btn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  btnText: { ...F.semibold, fontSize: 13 },
}));
