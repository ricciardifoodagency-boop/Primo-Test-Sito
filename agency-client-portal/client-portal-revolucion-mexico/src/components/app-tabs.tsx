import { Tabs } from 'expo-router';
import { Text, useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { brandColor } from '@/lib/api';

function TabEmoji({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: brandColor,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.backgroundElement,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Dashboard', tabBarIcon: () => <TabEmoji emoji="📊" /> }}
      />
      <Tabs.Screen
        name="approvazioni"
        options={{ title: 'Approvazioni', tabBarIcon: () => <TabEmoji emoji="✅" /> }}
      />
      <Tabs.Screen
        name="calendario"
        options={{ title: 'Calendario', tabBarIcon: () => <TabEmoji emoji="🗓️" /> }}
      />
      <Tabs.Screen
        name="competitor"
        options={{ title: 'Competitor', tabBarIcon: () => <TabEmoji emoji="🕵️" /> }}
      />
      <Tabs.Screen
        name="notifiche"
        options={{ title: 'Notifiche', tabBarIcon: () => <TabEmoji emoji="🔔" /> }}
      />
    </Tabs>
  );
}
