import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold } from '@expo-google-fonts/onest';
import { StoreProvider } from '../lib/store';
import { AuthProvider, useAuth } from '../lib/auth';
import { ThemeProvider, useTheme } from '../lib/theme';
import { StackHeader } from '../components/Header';

export default function RootLayout() {
  const [loaded] = useFonts({ Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold });
  if (!loaded) return null;
  return (
    <ThemeProvider>
      <AuthProvider>
        <StoreProvider>
          <Screens />
        </StoreProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function Screens() {
  const { c } = useTheme();
  const { session, ready } = useAuth();
  if (!ready) return null;
  const signedIn = !!session;
  return (
    <>
      <StatusBar style={c.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: c.bg },
          header: ({ options, navigation, back }) => (
            <StackHeader title={typeof options.title === 'string' ? options.title : ''} onBack={back ? navigation.goBack : undefined} />
          ),
        }}
      >
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="vocabulary" options={{ title: 'Vocabulary' }} />
          <Stack.Screen name="topics" options={{ title: 'Topics' }} />
          <Stack.Screen name="learn" options={{ title: 'Learn new words' }} />
          <Stack.Screen name="vocab-test" options={{ title: 'Test your vocabulary' }} />
          <Stack.Screen name="topic/[name]" options={{ title: '' }} />
          <Stack.Screen name="account" options={{ title: 'Account' }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
