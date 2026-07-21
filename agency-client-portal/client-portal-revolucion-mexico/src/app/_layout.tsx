import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { IntroVideo } from '@/components/intro-video';
import { registerForPushAsync } from '@/lib/push';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  // Intro video (TEMPORANEO): mostrata solo sul web, parte da sola all'avvio.
  const [showIntro, setShowIntro] = useState(Platform.OS === 'web');

  // Registrazione notifiche push all'avvio (best-effort; no-op su web/simulatore).
  useEffect(() => {
    registerForPushAsync().catch(() => {});
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
      {showIntro ? <IntroVideo onFinish={() => setShowIntro(false)} /> : null}
    </ThemeProvider>
  );
}
