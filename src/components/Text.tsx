import { forwardRef, type ComponentRef } from 'react';
import { Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps } from 'react-native';

/**
 * Caps for iOS Larger Text (maxFontSizeMultiplier).
 * Body text still grows a lot; big display text grows only a little so layouts hold.
 */
export const SCALE = {
  /** 38–44pt words and numbers */
  display: 1.15,
  /** 24–32pt screen titles */
  title: 1.25,
  /** tiles, calendar, segmented controls, pills, buttons */
  ui: 1.35,
  /** everything else */
  body: 1.6,
} as const;

/** react-native Text with a default Larger Text cap. Pass maxFontSizeMultiplier to override. */
export const Text = forwardRef<ComponentRef<typeof RNText>, TextProps>(function Text(props, ref) {
  return <RNText maxFontSizeMultiplier={SCALE.body} {...props} ref={ref} />;
});

/** react-native TextInput with a default Larger Text cap. */
export const TextInput = forwardRef<ComponentRef<typeof RNTextInput>, TextInputProps>(function TextInput(props, ref) {
  return <RNTextInput maxFontSizeMultiplier={SCALE.ui} {...props} ref={ref} />;
});
