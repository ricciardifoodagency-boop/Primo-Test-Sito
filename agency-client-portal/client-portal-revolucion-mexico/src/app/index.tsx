import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { brandColor, fetchKpi, RANGES, type Kpi, type RangeKey } from '@/lib/api';
import { formatEuro, formatInt, formatPct, formatUpdatedAt } from '@/lib/format';
import { downloadReport } from '@/lib/report';

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
  const [range, setRange] = useState<RangeKey>('30d');
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);

  const load = useCallback(async (r: RangeKey, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await fetchKpi(r);
      setKpi(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(range);
  }, [range, load]);

  const onReport = useCallback(async () => {
    if (!kpi) return;
    setReporting(true);
    try {
      await downloadReport(kpi, brandColor);
    } catch (e) {
      Alert.alert('Report non riuscito', e instanceof Error ? e.message : 'Riprova più tardi.');
    } finally {
      setReporting(false);
    }
  }, [kpi]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(range, true)}
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

          {/* Selettore periodo */}
          <View style={styles.periodRow}>
            {RANGES.map((r) => {
              const active = r.key === range;
              return (
                <Pressable
                  key={r.key}
                  onPress={() => setRange(r.key)}
                  style={[
                    styles.pill,
                    { borderColor: theme.backgroundElement },
                    active && { backgroundColor: brandColor, borderColor: brandColor },
                  ]}>
                  <ThemedText
                    type="small"
                    themeColor={active ? undefined : 'textSecondary'}
                    style={active ? styles.pillTextActive : undefined}>
                    {r.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={brandColor} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.loadingText}>
                Carico i dati…
              </ThemedText>
            </View>
          ) : error ? (
            <ThemedView type="backgroundElement" style={styles.errorBox}>
              <ThemedText type="smallBold">Impossibile caricare i dati</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.errorMsg}>
                {error}
              </ThemedText>
              <Pressable
                onPress={() => load(range)}
                style={[styles.retryBtn, { backgroundColor: brandColor }]}>
                <ThemedText type="smallBold" style={styles.textLight}>
                  Riprova
                </ThemedText>
              </Pressable>
            </ThemedView>
          ) : (
            <>
              <View style={styles.grid}>
                <KpiCard label="Spesa" value={formatEuro(kpi?.spend ?? 0)} />
                <KpiCard label={kpi?.resultLabel ?? 'Risultati'} value={formatInt(kpi?.results ?? 0)} />
              </View>
              <View style={styles.grid}>
                <KpiCard
                  label="Costo per risultato"
                  value={kpi?.costPerResult != null ? formatEuro(kpi.costPerResult) : '—'}
                />
                <KpiCard label="Impression" value={formatInt(kpi?.impressions ?? 0)} />
              </View>
              <View style={styles.grid}>
                <KpiCard label="Copertura" value={formatInt(kpi?.reach ?? 0)} />
                <KpiCard label="CTR" value={formatPct(kpi?.ctr ?? 0)} />
              </View>

              {/* Bottone report */}
              <Pressable
                onPress={onReport}
                disabled={reporting}
                style={[styles.reportBtn, { backgroundColor: brandColor }, reporting && styles.reportBtnDisabled]}>
                {reporting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <ThemedText type="smallBold" style={styles.textLight}>
                    📄  Scarica report ({kpi?.periodo ?? 'periodo'})
                  </ThemedText>
                )}
              </Pressable>

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
  scroll: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  brandDot: { width: 14, height: 14, borderRadius: 7 },
  periodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
  pill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillTextActive: { color: '#ffffff', fontWeight: '700' },
  loadingBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.six, gap: Spacing.two },
  loadingText: { marginTop: Spacing.two },
  grid: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.two },
  card: { flex: 1, borderRadius: Spacing.three, padding: Spacing.four, gap: Spacing.two },
  cardLabel: { textTransform: 'uppercase', letterSpacing: 0.5 },
  cardValue: { fontSize: 30, fontWeight: '700', lineHeight: 36 },
  reportBtn: {
    marginTop: Spacing.three,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  reportBtnDisabled: { opacity: 0.7 },
  textLight: { color: '#ffffff' },
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
});
