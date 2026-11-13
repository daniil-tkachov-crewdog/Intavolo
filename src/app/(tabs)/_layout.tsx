import type { ComponentProps } from 'react';
import { Text, type ColorValue } from 'react-native';
import { router, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { F, useTheme } from '../../lib/theme';
import { HeaderButton, TabHeader } from '../../components/Header';

type Icon = keyof typeof Ionicons.glyphMap;
type IconColor = ComponentProps<typeof Ionicons>['color'];

/** Filled icon when the tab is active, outline otherwise. */
const tab = (title: string, name: Icon) => ({
  title,
  tabBarIcon: ({ color, focused }: { color: unknown; focused: boolean }) => (
    <Ionicons name={focused ? name : (`${name}-outline` as Icon)} color={color as IconColor} size={25} />
  ),
  tabBarLabel: ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <Text style={[focused ? F.semibold : F.medium, { color, fontSize: 11, marginTop: 3 }]}>{title}</Text>
  ),
});

export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border, borderTopWidth: 1, paddingTop: 10 },
        sceneStyle: { backgroundColor: c.bg },
        header: ({ options }) => <TabHeader title={options.title ?? ''} right={options.headerRight?.({ canGoBack: false })} />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          ...tab('Explore', 'compass'),
          headerRight: () => <HeaderButton icon="albums-outline" label="Topics and search" onPress={() => router.push('/topics')} />,
        }}
      />
      <Tabs.Screen name="exercise" options={tab('Exercise', 'school')} />
      <Tabs.Screen name="profile" options={tab('Profile', 'person')} />
    </Tabs>
  );
}
