import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { C } from '../lib/theme';

interface Props {
  label: string;
  onPress: () => void;
  color?: string;
  outline?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, color = C.primary, outline, disabled, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        outline ? { borderColor: color, borderWidth: 1.5 } : { backgroundColor: color },
        (pressed || disabled) && { opacity: 0.55 },
        style,
      ]}
    >
      <Text style={[s.label, { color: outline ? color : '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 16, fontWeight: '600' },
});
