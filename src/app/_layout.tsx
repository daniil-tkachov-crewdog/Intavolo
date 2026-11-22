import { useEffect } from 'react';
import { router, Stack, type Href } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold } from '@expo-google-fonts/onest';
import { StoreProvider } from '../lib/store';
import { AuthProvider, useAuth } from '../lib/auth';
import { ThemeProvider, useTheme } from '../lib/theme';
import { StackHeader } from '../components/Header';
import { ActivityProvider } from '../lib/activity';
import { Celebration } from '../components/Celebration';

export default function RootLayout() {
  const [loaded] = useFonts({ Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold });
  if (!loaded) return null;
  return (
    <ThemeProvider>
      <AuthProvider>
        <StoreProvider>
          <ActivityProvider>
            <Screens />
          </ActivityProvider>
        </StoreProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function Screens() {
  const { c } = useTheme();
  const { session, ready } = useAuth();
  const signedIn = !!session;
  const tapped = Notifications.useLastNotificationResponse();

  // Reminder tapped → straight to practice.
  useEffect(() => {
    const url = tapped?.notification.request.content.data?.url;
    if (ready && signedIn && typeof url === 'string') {
      router.navigate(url as Href);
      Notifications.clearLastNotificationResponse();
    }
  }, [tapped, ready, signedIn]);

  if (!ready) return null;

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
          <Stack.Screen name="grammar" options={{ title: 'Grammar' }} />
          <Stack.Screen name="sentences" options={{ title: 'Sentences' }} />
          <Stack.Screen name="grammar/[id]" options={{ title: '' }} />
          <Stack.Screen name="topic/[name]" options={{ title: '' }} />
          <Stack.Screen name="account" options={{ title: 'Account' }} />
          <Stack.Screen name="streak" options={{ title: 'Streak' }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
      {signedIn && <Celebration />}
    </>
  );
}
