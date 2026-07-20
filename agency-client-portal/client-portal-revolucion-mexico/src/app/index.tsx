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
import { useTheme } from '@/hooks/use-theme';
import { brandColor, fetchKpi, type Kpi } from '@/lib/api';

function formatInt(n: number): string {
  return Math.round(n).toLocaleString('it-IT');
}

function formatEuro(n: number): string {
  return (
    '€ ' +
    n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

function formatUpdatedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.cardLabel}>
        {label}
      </ThemedText>
      <ThemedText style={styles.cardValue}>{value}</ThemedText>
    </ThemedView>
  );
}

export default function DashboardScreen() {
  const theme = useTheme();
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await fetchKpi();
      setKpi(data);
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
        <ThemedText type="small" themeColor="textSecondary" style={styles.centeredText}>
          Carico i dati…
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={brandColor}
            />
          }>
          <View style={styles.header}>
            <View style={[styles.brandDot, { backgroundColor: brandColor }]} />
            <ThemedText type="subtitle">{kpi?.displayName ?? 'Portale cliente'}</ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            KPI Meta Ads · {kpi?.periodo ?? 'ultimi 30 giorni'}
          </ThemedText>

          {error ? (
            <ThemedView type="backgroundElement" style={styles.errorBox}>
              <ThemedText type="smallBold">Impossibile caricare i dati</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.errorMsg}>
                {error}
              </ThemedText>
              <Pressable
                onPress={() => load()}
                style={[styles.retryBtn, { backgroundColor: brandColor }]}>
                <ThemedText type="smallBold" style={styles.retryText}>
                  Riprova
                </ThemedText>
              </Pressable>
            </ThemedView>
          ) : (
            <>
              <View style={styles.grid}>
                <KpiCard label="Spesa" value={formatEuro(kpi?.spend ?? 0)} />
                <KpiCard label="Risultati" value={formatInt(kpi?.results ?? 0)} />
              </View>
              <View style={styles.grid}>
                <KpiCard
                  label="Costo per risultato"
                  value={kpi?.costPerResult != null ? formatEuro(kpi.costPerResult) : '—'}
                />
                <KpiCard label="Impression" value={formatInt(kpi?.impressions ?? 0)} />
              </View>

              {kpi?.aggiornatoIl && (
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={[styles.updated, { borderTopColor: theme.backgroundElement }]}>
                  Aggiornato il {formatUpdatedAt(kpi.aggiornatoIl)}
                </ThemedText>
              )}
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  centeredText: { marginTop: Spacing.two },
  scroll: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  brandDot: { width: 14, height: 14, borderRadius: 7 },
  grid: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.two },
  card: { flex: 1, borderRadius: Spacing.three, padding: Spacing.four, gap: Spacing.two },
  cardLabel: { textTransform: 'uppercase', letterSpacing: 0.5 },
  cardValue: { fontSize: 30, fontWeight: '700', lineHeight: 36 },
  updated: {
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  errorBox: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  errorMsg: { marginBottom: Spacing.two },
  retryBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  retryText: { color: '#ffffff' },
});
