import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StoreProvider } from '../lib/store';
import { C } from '../lib/theme';

export default function RootLayout() {
  return (
    <StoreProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ contentStyle: { backgroundColor: C.bg }, headerTintColor: C.primary }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="vocabulary" options={{ title: 'Vocabulary', headerBackTitle: 'Profile' }} />
        <Stack.Screen name="topics" options={{ title: 'Topics', headerBackTitle: 'Explore' }} />
        <Stack.Screen name="vocab-test" options={{ title: 'Test your vocabulary', headerBackTitle: 'Exercise' }} />
        <Stack.Screen name="topic/[name]" options={{ title: '', headerBackTitle: 'Topics' }} />
      </Stack>
    </StoreProvider>
  );
}
