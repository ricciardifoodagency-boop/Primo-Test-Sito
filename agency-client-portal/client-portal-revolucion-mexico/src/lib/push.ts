// Registrazione alle notifiche push. Su un dispositivo reale ottiene il push
// token di Expo e lo registra sul backend. In Expo Go / simulatore o senza
// permesso non fa nulla (ritorna null).

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { registerDevice } from './api';

// Come mostrare le notifiche quando l'app è in primo piano.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushAsync(): Promise<string | null> {
  // Le push vere funzionano solo su dispositivo fisico.
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  try {
    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResp.data;
    try {
      await registerDevice(token);
    } catch {
      // registrazione best-effort: se il backend non risponde, riproveremo al
      // prossimo avvio.
    }
    return token;
  } catch {
    return null;
  }
}
