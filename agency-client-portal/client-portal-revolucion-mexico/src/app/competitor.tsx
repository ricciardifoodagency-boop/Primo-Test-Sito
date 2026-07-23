import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
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
import { useTheme } from '@/hooks/use-theme';
import { brandColor, fetchCompetitors, type CompetitorSnapshot } from '@/lib/api';
import { useTabGuard } from '@/lib/use-tab-guard';

function formatDate(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

function formatRefreshed(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
}

export default function CompetitorRoute() {
  const guard = useTabGuard('competitor');
  if (guard) return guard;
  return <CompetitorScreen />;
}

function CompetitorScreen() {
  const theme = useTheme();
  const [snapshot, setSnapshot] = useState<CompetitorSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setSnapshot(await fetchCompetitors());
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

  const totalAds = snapshot?.competitors.reduce((s, c) => s + c.activeAds, 0) ?? 0;

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
          <ThemedText type="subtitle">Competitor</ThemedText>

          {error ? (
            <ThemedView type="backgroundElement" style={styles.errorBox}>
              <ThemedText type="smallBold">Impossibile caricare i competitor</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.errorMsg}>
                {error}
              </ThemedText>
              <Pressable onPress={() => load()} style={[styles.retryBtn, { backgroundColor: brandColor }]}>
                <ThemedText type="smallBold" style={styles.textLight}>
                  Riprova
                </ThemedText>
              </Pressable>
            </ThemedView>
          ) : (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                {snapshot?.competitors.length ?? 0} competitor · {totalAds} inserzioni attive totali
                {snapshot?.refreshedAt ? ` · aggiornato il ${formatRefreshed(snapshot.refreshedAt)}` : ''}
              </ThemedText>

              {snapshot?.competitors.map((c) => (
                <ThemedView key={c.pageId} type="backgroundElement" style={styles.card}>
                  <View style={styles.cardHead}>
                    <ThemedText type="smallBold" style={styles.name}>
                      {c.name}
                    </ThemedText>
                    <View style={[styles.badge, { backgroundColor: brandColor }]}>
                      <ThemedText type="small" style={styles.badgeText}>
                        {c.activeAds} inserzioni attive
                      </ThemedText>
                    </View>
                  </View>

                  {c.ads.map((ad, i) => (
                    <View
                      key={ad.snapshotUrl}
                      style={[styles.ad, { borderTopColor: theme.background }, i === 0 && styles.adFirst]}>
                      <View style={styles.adText}>
                        <ThemedText type="small" style={styles.adTitle} numberOfLines={2}>
                          {ad.title || 'Creatività senza titolo'}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary" style={styles.adDate}>
                          attiva dal {formatDate(ad.startTime)}
                        </ThemedText>
                      </View>
                      <Pressable onPress={() => Linking.openURL(ad.snapshotUrl)} hitSlop={8}>
                        <ThemedText type="smallBold" style={{ color: brandColor }}>
                          Vedi ›
                        </ThemedText>
                      </Pressable>
                    </View>
                  ))}
                </ThemedView>
              ))}

              <ThemedText type="small" themeColor="textSecondary" style={styles.footNote}>
                Dati dalla Meta Ad Library. Le inserzioni pubbliche sono consultabili da chiunque.
              </ThemedText>
            </>
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
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  name: { flex: 1, fontSize: 15 },
  badge: { borderRadius: 999, paddingHorizontal: Spacing.two + 2, paddingVertical: 3 },
  badgeText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  ad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  adFirst: { marginTop: Spacing.one },
  adText: { flex: 1, gap: 1 },
  adTitle: { fontWeight: '600' },
  adDate: { fontSize: 12 },
  footNote: { marginTop: Spacing.two },
  errorBox: { borderRadius: Spacing.three, padding: Spacing.four, gap: Spacing.two },
  errorMsg: { marginBottom: Spacing.two },
  retryBtn: { alignSelf: 'flex-start', paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderRadius: Spacing.two },
  textLight: { color: '#ffffff' },
});
