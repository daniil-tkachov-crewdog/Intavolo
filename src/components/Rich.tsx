import { Text, type StyleProp, type TextStyle } from 'react-native';
import { splitItalian } from '../lib/grammar';
import { F } from '../lib/theme';

/** Text where *Italian words* are shown in bold. */
export function Rich({ text, style }: { text: string; style?: StyleProp<TextStyle> }) {
  return (
    <Text style={style}>
      {splitItalian(text).map(({ part, it }, i) =>
        it ? (
          <Text key={i} style={F.bold}>
            {part}
          </Text>
        ) : (
          part
        )
      )}
    </Text>
  );
}
