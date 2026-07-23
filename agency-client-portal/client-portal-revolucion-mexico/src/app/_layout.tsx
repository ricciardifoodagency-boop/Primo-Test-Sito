import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { IntroVideo } from '@/components/intro-video';
import { RolePicker } from '@/components/role-picker';
import { RoleProvider, useRole } from '@/lib/role-context';
import { registerForPushAsync } from '@/lib/push';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();

  // Registrazione notifiche push all'avvio (best-effort; no-op su web/simulatore).
  useEffect(() => {
    registerForPushAsync().catch(() => {});
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <RoleProvider>
        <RootShell />
      </RoleProvider>
    </ThemeProvider>
  );
}

function RootShell() {
  const { ready, role } = useRole();
  // Intro video (TEMPORANEO): mostrata solo sul web, parte da sola all'avvio.
  const [showIntro, setShowIntro] = useState(Platform.OS === 'web');

  return (
    <>
      <AnimatedSplashOverlay />
      <AppTabs />
      {/* Nessun ruolo scelto: mostra la selezione (sotto l'eventuale intro). */}
      {ready && !role ? <RolePicker /> : null}
      {showIntro ? <IntroVideo onFinish={() => setShowIntro(false)} /> : null}
    </>
  );
}
