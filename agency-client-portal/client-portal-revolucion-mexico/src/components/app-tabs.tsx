import { Tabs } from 'expo-router';
import { Text, useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { brandColor } from '@/lib/api';
import { useRole } from '@/lib/role-context';
import { ALL_TAB_NAMES, TAB_META, visibleTabs } from '@/lib/role';

function TabEmoji({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { role } = useRole();
  const allowed = new Set(visibleTabs(role));

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
      {ALL_TAB_NAMES.map((name) => {
        const meta = TAB_META[name];
        // Le rotte non pertinenti al ruolo vengono nascoste dalla tab bar.
        const hidden = !allowed.has(name);
        return (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title: meta.title,
              tabBarIcon: () => <TabEmoji emoji={meta.emoji} />,
              href: hidden ? null : undefined,
            }}
          />
        );
      })}
      {/* Schermata raggiungibile da Notifiche, nascosta dalla tab bar */}
      <Tabs.Screen name="impostazioni-alert" options={{ href: null }} />
    </Tabs>
  );
}
