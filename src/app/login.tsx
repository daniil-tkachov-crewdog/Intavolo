import { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SCALE, Text } from '../components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router, useLocalSearchParams } from 'expo-router';
import { Cancelled, useAuth } from '../lib/auth';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { F, makeStyles, useTheme } from '../lib/theme';

export default function Login() {
  const s = useStyles();
  const { c } = useTheme();
  const { top, bottom } = useSafeAreaInsets();
  const { signInEmail, signUpEmail, signInGoogle, signInApple, guest, continueAsGuest } = useAuth();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<'login' | 'signup'>(params.mode === 'signup' ? 'signup' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [appleOk, setAppleOk] = useState(false);
  const [kb, setKb] = useState(false);
  const { height } = useWindowDimensions();

  // Less space above the title on short screens (SE) and while the keyboard is up.
  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setKb(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKb(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const topGap = kb ? 16 : height < 700 ? 32 : 64;

  useEffect(() => {
    if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setAppleOk);
  }, []);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await fn();
    } catch (e) {
      if (!(e instanceof Cancelled)) setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    const e = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(e)) return setError('Enter a valid email.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    run(async () => {
      if (mode === 'login') return signInEmail(e, password);
      if (await signUpEmail(e, password)) setInfo(`Check ${e} to confirm your account, then log in.`);
    });
  };

  const signup = mode === 'signup';
  // Guests opened this from Profile: just go back. First launch: start using the app without an account.
  const skip = () => (guest ? (router.canGoBack() ? router.back() : router.replace('/')) : continueAsGuest());

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[s.wrap, { paddingTop: top + topGap, paddingBottom: bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={s.head}>
          <Text style={s.title} maxFontSizeMultiplier={SCALE.display}>
            Intavolo
          </Text>
          <Text style={s.sub}>
            {guest
              ? 'Your progress will move into your account and sync.'
              : signup
                ? 'Create an account to save your progress.'
                : 'Log in to continue learning Italian.'}
          </Text>
        </View>

        <View style={s.group}>
          {appleOk && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={signup ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={c.dark ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={18}
              style={{ height: 54 }}
              onPress={() => !busy && run(signInApple)}
            />
          )}
          <View style={s.row}>
            <Button label="Continue with Google" icon="logo-google" variant="secondary" onPress={() => run(signInGoogle)} disabled={busy} />
          </View>
        </View>

        <View style={s.divider}>
          <View style={s.line} />
          <Text style={s.or}>or</Text>
          <View style={s.line} />
        </View>

        <View style={s.group}>
          <Field icon="mail-outline" placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
          <Field
            icon="lock-closed-outline"
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={signup ? 'new-password' : 'current-password'}
            textContentType={signup ? 'newPassword' : 'password'}
            onSubmitEditing={submit}
            returnKeyType="go"
          />
          {error && <Text style={s.error}>{error}</Text>}
          {info && <Text style={s.info}>{info}</Text>}
          <View style={s.row}>
            <Button label={signup ? 'Create account' : 'Log in'} onPress={submit} disabled={busy} />
          </View>
        </View>

        <Pressable
          onPress={() => {
            setMode(signup ? 'login' : 'signup');
            setError(null);
          }}
          hitSlop={8}
          style={s.switch}
        >
          <Text style={s.switchText}>
            {signup ? 'Already have an account? ' : 'New to Intavolo? '}
            <Text style={s.switchLink}>{signup ? 'Log in' : 'Create account'}</Text>
          </Text>
        </Pressable>

        <Pressable onPress={skip} disabled={busy} hitSlop={8} style={s.switch}>
          <Text style={s.switchLink}>{guest ? 'Not now' : 'Continue without an account'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { flexGrow: 1, paddingHorizontal: 16, gap: 20 },
  head: { gap: 6, marginBottom: 12 },
  title: { ...F.bold, fontSize: 40, letterSpacing: -0.8, color: c.text },
  sub: { ...F.regular, fontSize: 16, color: c.muted },
  group: { gap: 10 },
  row: { flexDirection: 'row' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  line: { flex: 1, height: 1, backgroundColor: c.border },
  or: { ...F.regular, fontSize: 13, color: c.muted },
  error: { ...F.regular, fontSize: 14, color: c.accent.red.text },
  info: { ...F.regular, fontSize: 14, color: c.accent.green.text },
  switch: { alignSelf: 'center', paddingVertical: 4 },
  switchText: { ...F.regular, fontSize: 15, color: c.muted },
  switchLink: { ...F.semibold, fontSize: 15, color: c.primary },
}));
