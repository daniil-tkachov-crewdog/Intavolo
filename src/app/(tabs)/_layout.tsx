import type { ComponentProps } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../lib/theme';

type Icon = keyof typeof Ionicons.glyphMap;
type IconColor = ComponentProps<typeof Ionicons>['color'];
const icon = (name: Icon) => ({ color, size }: { color: unknown; size: number }) => (
  <Ionicons name={name} color={color as IconColor} size={size} />
);

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.muted,
        headerStyle: { backgroundColor: C.bg },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Explore', tabBarIcon: icon('compass') }} />
      <Tabs.Screen name="practice" options={{ title: 'Practice', tabBarIcon: icon('school') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('person') }} />
    </Tabs>
  );
}
