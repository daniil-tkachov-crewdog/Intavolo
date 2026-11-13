import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { F, glow, useTheme } from '../lib/theme';

type Icon = keyof typeof Ionicons.glyphMap;

interface Props {
  label: string;
  onPress: () => void;
  /** primary: purple fill · success: soft green · secondary: card with border */
  variant?: 'primary' | 'success' | 'secondary';
  icon?: Icon; // before the label
  iconRight?: Icon; // after the label
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', icon, iconRight, disabled, style }: Props) {
  const { c } = useTheme();
  const look =
    variant === 'primary'
      ? { bg: c.primary, fg: '#FFFFFF', extra: disabled ? null : glow }
      : variant === 'success'
        ? { bg: c.accent.green.soft, fg: c.accent.green.text, extra: null }
        : { bg: c.card, fg: c.muted, extra: { borderWidth: 1, borderColor: c.border } };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [s.btn, { backgroundColor: look.bg }, look.extra, (pressed || disabled) && { opacity: 0.55 }, style]}
    >
      {icon && <Ionicons name={icon} size={20} color={look.fg} />}
      <Text style={[s.label, { color: look.fg }]}>{label}</Text>
      {iconRight && <Ionicons name={iconRight} size={18} color={look.fg} />}
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: { flex: 1, height: 54, borderRadius: 18, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  label: { ...F.semibold, fontSize: 16 },
});
