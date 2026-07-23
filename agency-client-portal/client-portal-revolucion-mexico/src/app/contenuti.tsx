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
import {
  brandColor,
  fetchCreatives,
  updateCreativeStatus,
  type Creative,
  type CreativeStatus,
} from '@/lib/api';

const STATO_LABEL: Record<CreativeStatus, string> = {
  in_attesa: 'In attesa',
  approvata: 'Approvata',
  rifiutata: 'Rifiutata',
};
const STATO_COLORE: Record<CreativeStatus, string> = {
  in_attesa: '#B0740B',
  approvata: '#1F7A3D',
  rifiutata: '#B3261E',
};

export default function ApprovazioniScreen() {
  const [items, setItems] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setItems(await fetchCreatives());
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

  const decidi = useCallback(async (id: string, stato: CreativeStatus) => {
    // Ottimistico: aggiorna subito la UI, poi salva sul backend.
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, stato } : c)));
    try {
      await updateCreativeStatus(id, stato);
    } catch {
      // In caso di errore ricarica lo stato reale.
      load();
    }
  }, [load]);

  const inAttesa = items.filter((c) => c.stato === 'in_attesa').length;

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
          <ThemedText type="subtitle">Approvazioni</ThemedText>
          {error ? (
            <ThemedView type="backgroundElement" style={styles.box}>
              <ThemedText type="small" themeColor="textSecondary">
                {error}
              </ThemedText>
            </ThemedView>
          ) : (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                {inAttesa === 0
                  ? 'Tutto approvato, niente in sospeso 🎉'
                  : `${inAttesa} creatività da revisionare`}
              </ThemedText>

              {items.map((c) => (
                <ThemedView key={c.id} type="backgroundElement" style={styles.card}>
                  <View style={styles.cardHead}>
                    <ThemedText type="smallBold" style={styles.cardTitle}>
                      {c.titolo}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: STATO_COLORE[c.stato] }}>
                      {STATO_LABEL[c.stato]}
                    </ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {c.formato} · pianificata {c.pianificata}
                  </ThemedText>

                  {c.stato === 'in_attesa' && (
                    <View style={styles.actions}>
                      <Pressable
                        onPress={() => decidi(c.id, 'approvata')}
                        style={[styles.btn, { backgroundColor: brandColor }]}>
                        <ThemedText type="smallBold" style={styles.btnTextLight}>
                          Approva
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => decidi(c.id, 'rifiutata')}
                        style={[styles.btn, styles.btnGhost, { borderColor: STATO_COLORE.rifiutata }]}>
                        <ThemedText type="smallBold" style={{ color: STATO_COLORE.rifiutata }}>
                          Rifiuta
                        </ThemedText>
                      </Pressable>
                    </View>
                  )}
                </ThemedView>
              ))}
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
  box: { borderRadius: Spacing.three, padding: Spacing.four },
  card: { borderRadius: Spacing.three, padding: Spacing.four, gap: Spacing.two },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  cardTitle: { flex: 1 },
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  btn: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderRadius: Spacing.two },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1 },
  btnTextLight: { color: '#ffffff' },
});
