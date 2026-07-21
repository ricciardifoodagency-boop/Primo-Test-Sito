import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { brandColor, fetchCalendar, type CalendarItem } from '@/lib/api';

export default function CalendarioScreen() {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setItems(await fetchCalendar());
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
          <ThemedText type="subtitle">Calendario</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Contenuti programmati
          </ThemedText>

          {error ? (
            <ThemedView type="backgroundElement" style={styles.box}>
              <ThemedText type="small" themeColor="textSecondary">
                {error}
              </ThemedText>
            </ThemedView>
          ) : (
            items.map((c) => (
              <ThemedView key={c.id} type="backgroundElement" style={styles.row}>
                <View style={[styles.dateBox, { backgroundColor: brandColor }]}>
                  <ThemedText type="small" style={styles.dateGiorno}>
                    {c.giorno}
                  </ThemedText>
                  <ThemedText type="smallBold" style={styles.dateData}>
                    {c.data}
                  </ThemedText>
                </View>
                <View style={styles.rowBody}>
                  <ThemedText type="smallBold">{c.titolo}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {c.canale}
                  </ThemedText>
                </View>
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
  box: { borderRadius: Spacing.three, padding: Spacing.four },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  dateBox: {
    width: 58,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateGiorno: { color: '#ffffff', letterSpacing: 1 },
  dateData: { color: '#ffffff' },
  rowBody: { flex: 1, gap: 2 },
});
