import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { brandColor, fetchNotifications, type AppNotification } from '@/lib/api';

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificheScreen() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setItems(await fetchNotifications());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={brandColor} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={brandColor} />
          }>
          <View style={styles.header}>
            <ThemedText type="subtitle">Notifiche</ThemedText>
            <Pressable
              onPress={() => router.push('/impostazioni-alert')}
              hitSlop={10}
              accessibilityLabel="Impostazioni alert">
              <ThemedText style={styles.gear}>⚙️</ThemedText>
            </Pressable>
          </View>

          {error ? (
            <ThemedView type="backgroundElement" style={styles.box}>
              <ThemedText type="smallBold">Impossibile caricare le notifiche</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.errMsg}>
                {error}
              </ThemedText>
              <Pressable onPress={() => load()} style={[styles.retryBtn, { backgroundColor: brandColor }]}>
                <ThemedText type="smallBold" style={styles.textLight}>
                  Riprova
                </ThemedText>
              </Pressable>
            </ThemedView>
          ) : items.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.box}>
              <ThemedText type="small" themeColor="textSecondary">
                Nessuna notifica per ora.
              </ThemedText>
            </ThemedView>
          ) : (
            items.map((n) => (
              <ThemedView key={n.id} type="backgroundElement" style={styles.item}>
                <View style={styles.itemHead}>
                  <View style={[styles.dot, { backgroundColor: brandColor }]} />
                  <ThemedText type="smallBold" style={styles.itemTitle}>
                    {n.title}
                  </ThemedText>
                </View>
                <ThemedText type="small" themeColor="textSecondary" style={styles.itemBody}>
                  {n.body}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.itemWhen}>
                  {formatWhen(n.sentAt)}
                </ThemedText>
              </ThemedView>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gear: { fontSize: 22 },
  item: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 9, height: 9, borderRadius: 5 },
  itemTitle: { flex: 1, fontSize: 15 },
  itemBody: { lineHeight: 20 },
  itemWhen: { fontSize: 12 },
  box: { borderRadius: Spacing.three, padding: Spacing.four, gap: Spacing.two },
  errMsg: { marginBottom: Spacing.two },
  retryBtn: { alignSelf: 'flex-start', paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderRadius: Spacing.two },
  textLight: { color: '#ffffff' },
});
