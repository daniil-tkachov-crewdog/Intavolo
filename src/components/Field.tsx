import { TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { F, makeStyles, useTheme } from '../lib/theme';

/** Bordered text input with a leading icon. */
export function Field({ icon, ...props }: TextInputProps & { icon: keyof typeof Ionicons.glyphMap }) {
  const s = useStyles();
  const { c } = useTheme();
  return (
    <View style={s.box}>
      <Ionicons name={icon} size={18} color={c.muted} />
      <TextInput placeholderTextColor={c.muted} autoCapitalize="none" autoCorrect={false} style={s.input} {...props} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  box: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 54, paddingHorizontal: 16, backgroundColor: c.card, borderRadius: 18, borderWidth: 1, borderColor: c.border },
  input: { ...F.regular, flex: 1, fontSize: 16, color: c.text, paddingVertical: 0 },
}));
