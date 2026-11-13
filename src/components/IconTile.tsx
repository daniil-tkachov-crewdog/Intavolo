import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Accent } from '../lib/theme';

/** Rounded square with a coloured icon on a soft tint. */
export function IconTile({ icon, accent, size = 36 }: { icon: keyof typeof Ionicons.glyphMap; accent: Accent; size?: number }) {
  const { c } = useTheme();
  const tone = c.accent[accent];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 3, backgroundColor: tone.soft, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={Math.round(size / 2.05)} color={tone.fg} />
    </View>
  );
}
