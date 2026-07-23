import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
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

function formatData(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

export default function ApprovazioniScreen() {
  const theme = useTheme();
  const [items, setItems] = useState<Creative[]>([]);
  const [driveUrl, setDriveUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rifiuto in corso: id della card + motivo scritto.
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetchCreatives();
      setItems(res.creatives);
      setDriveUrl(res.driveUrl);
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

  const approva = useCallback(
    async (id: string) => {
      setBusyId(id);
      setItems((prev) => prev.map((c) => (c.id === id ? { ...c, stato: 'approvata' } : c)));
      try {
        await updateCreativeStatus(id, 'approvata');
      } catch (e) {
        Alert.alert('Errore', e instanceof Error ? e.message : 'Riprova.');
        load();
      } finally {
        setBusyId(null);
      }
    },
    [load],
  );

  const confermaRifiuto = useCallback(
    async (id: string) => {
      if (!reason.trim()) {
        Alert.alert('Motivo obbligatorio', 'Scrivi perché rifiuti il video prima di confermare.');
        return;
      }
      setBusyId(id);
      try {
        await updateCreativeStatus(id, 'rifiutata', reason.trim());
        // Rifiutato: sparisce dalla lista (cestinato dal Drive).
        setItems((prev) => prev.filter((c) => c.id !== id));
        setRejectingId(null);
        setReason('');
        Alert.alert('Video rifiutato', "L'addetto contenuti riceverà una notifica con il motivo.");
      } catch (e) {
        Alert.alert('Errore', e instanceof Error ? e.message : 'Riprova.');
      } finally {
        setBusyId(null);
      }
    },
    [reason],
  );

  // Raggruppa per "gruppo" (sottocartella del Drive), preservando l'ordine.
  const groups = useMemo(() => {
    const map = new Map<string, Creative[]>();
    for (const c of items) {
      const g = c.gruppo || 'Contenuti';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(c);
    }
    return [...map.entries()];
  }, [items]);

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
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={brandColor} />
          }>
          <ThemedText type="subtitle">Approvazioni</ThemedText>

          {/* Collegamento al Drive */}
          {driveUrl ? (
            <Pressable
              onPress={() => Linking.openURL(driveUrl)}
              style={[styles.driveBtn, { borderColor: brandColor }]}>
              <ThemedText type="smallBold" style={{ color: brandColor }}>
                📁 Apri la cartella Drive
              </ThemedText>
            </Pressable>
          ) : null}

          {error ? (
            <ThemedView type="backgroundElement" style={styles.box}>
              <ThemedText type="small" themeColor="textSecondary">
                {error}
              </ThemedText>
            </ThemedView>
          ) : (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                {items.length === 0
                  ? 'Nessun video da revisionare.'
                  : inAttesa === 0
                    ? 'Tutto revisionato 🎉'
                    : `${inAttesa} video da revisionare`}
              </ThemedText>

              {groups.map(([gruppo, list]) => (
                <View key={gruppo} style={styles.group}>
                  <ThemedText type="smallBold" themeColor="textSecondary" style={styles.groupTitle}>
                    {gruppo.toUpperCase()}
                  </ThemedText>

                  {list.map((c) => (
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
                        {c.formato}
                        {c.pianificata ? ` · ${formatData(c.pianificata)}` : ''}
                      </ThemedText>

                      {c.mediaUrl ? (
                        <Pressable onPress={() => Linking.openURL(c.mediaUrl!)}>
                          <ThemedText type="small" style={{ color: brandColor }}>
                            ▶ Apri video
                          </ThemedText>
                        </Pressable>
                      ) : null}

                      {c.stato === 'in_attesa' && rejectingId !== c.id && (
                        <View style={styles.actions}>
                          <Pressable
                            disabled={busyId === c.id}
                            onPress={() => approva(c.id)}
                            style={[styles.btn, { backgroundColor: brandColor }, busyId === c.id && styles.disabled]}>
                            <ThemedText type="smallBold" style={styles.btnTextLight}>
                              Approva
                            </ThemedText>
                          </Pressable>
                          <Pressable
                            onPress={() => {
                              setRejectingId(c.id);
                              setReason('');
                            }}
                            style={[styles.btn, styles.btnGhost, { borderColor: STATO_COLORE.rifiutata }]}>
                            <ThemedText type="smallBold" style={{ color: STATO_COLORE.rifiutata }}>
                              Rifiuta
                            </ThemedText>
                          </Pressable>
                        </View>
                      )}

                      {/* Rifiuto: motivo scrivibile PRIMA di confermare */}
                      {rejectingId === c.id && (
                        <View style={styles.rejectBox}>
                          <ThemedText type="small" themeColor="textSecondary">
                            Perché rifiuti questo video? (obbligatorio)
                          </ThemedText>
                          <TextInput
                            value={reason}
                            onChangeText={setReason}
                            placeholder="Scrivi il motivo del rifiuto…"
                            placeholderTextColor={theme.textSecondary}
                            multiline
                            autoFocus
                            style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                          />
                          <View style={styles.actions}>
                            <Pressable
                              disabled={busyId === c.id}
                              onPress={() => confermaRifiuto(c.id)}
                              style={[styles.btn, { backgroundColor: STATO_COLORE.rifiutata }, busyId === c.id && styles.disabled]}>
                              {busyId === c.id ? (
                                <ActivityIndicator color="#fff" />
                              ) : (
                                <ThemedText type="smallBold" style={styles.btnTextLight}>
                                  Conferma rifiuto
                                </ThemedText>
                              )}
                            </Pressable>
                            <Pressable
                              disabled={busyId === c.id}
                              onPress={() => {
                                setRejectingId(null);
                                setReason('');
                              }}
                              style={[styles.btn, styles.btnGhost, { borderColor: theme.backgroundSelected }]}>
                              <ThemedText type="smallBold">Annulla</ThemedText>
                            </Pressable>
                          </View>
                        </View>
                      )}
                    </ThemedView>
                  ))}
                </View>
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
  driveBtn: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: { borderRadius: Spacing.three, padding: Spacing.four },
  group: { gap: Spacing.two },
  groupTitle: { letterSpacing: 0.5, marginTop: Spacing.two },
  card: { borderRadius: Spacing.three, padding: Spacing.four, gap: Spacing.two },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  cardTitle: { flex: 1 },
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two, flexWrap: 'wrap' },
  btn: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderRadius: Spacing.two, minHeight: 40, justifyContent: 'center', alignItems: 'center' },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1 },
  btnTextLight: { color: '#ffffff' },
  disabled: { opacity: 0.6 },
  rejectBox: { gap: Spacing.two, marginTop: Spacing.two },
  input: {
    minHeight: 70,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    fontSize: 15,
    textAlignVertical: 'top',
  },
});
