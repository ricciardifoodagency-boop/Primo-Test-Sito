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

  // Registrazione notifiche push all'avvio (best-effort; no-op su web/simulatore).
  useEffect(() => {
    registerForPushAsync().catch(() => {});
  }, []);

  // TEMPORANEO: intro "demo" all'avvio. Solo su device (non nel render web).
  const [introDone, setIntroDone] = useState(false);
  const showIntro = Platform.OS !== 'web' && !introDone;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
      {showIntro && <IntroVideo onFinish={() => setIntroDone(true)} />}
    </ThemeProvider>
  );
}
