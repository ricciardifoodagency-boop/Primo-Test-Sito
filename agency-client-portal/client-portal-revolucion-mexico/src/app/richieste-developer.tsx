// Inbox del Developer: elenco di tutte le "richieste al developer" (da Gestore,
// Addetto e dai ticket del Ristoratore). Il Developer può cambiare stato e
// rispondere (la risposta genera una notifica a chi ha inviato).

import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { brandColor } from '@/lib/api';
import {
  fetchRequests,
  updateRequest,
  type ClientRequest,
  type RequestStatus,
} from '@/lib/requests';

const STATUS_LABEL: Record<string, string> = {
  inviata: 'Inviata',
  in_carico: 'Presa in carico',
  completata: 'Completata',
};
const STATUS_COLOR: Record<string, string> = {
  inviata: '#B0740B',
  in_carico: '#1F5FB0',
  completata: '#1F7A3D',
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
}

export default function RichiesteDeveloperScreen() {
  const theme = useTheme();
  const [items, setItems] = useState<ClientRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, string>>({});

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setItems(await fetchRequests('developer'));
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

  const patch = useCallback(
    async (id: string, body: { status?: RequestStatus; reply?: string }) => {
      setBusyId(id);
      try {
        const updated = await updateRequest(id, body);
        setItems((prev) => prev.map((r) => (r.id === id ? updated : r)));
        if (body.reply) setReplies((p) => ({ ...p, [id]: '' }));
      } catch (e) {
        Alert.alert('Errore', e instanceof Error ? e.message : 'Riprova più tardi.');
      } finally {
        setBusyId(null);
      }
    },
    []
  );

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
          <ThemedText type="subtitle">🛠️ Richieste al developer</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Tutte le richieste tecniche in arrivo. Aggiorna lo stato o rispondi.
          </ThemedText>

          {error ? (
            <ThemedText type="small" themeColor="textSecondary">
              {error}
            </ThemedText>
          ) : items.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Nessuna richiesta al developer, per ora.
            </ThemedText>
          ) : (
            items.map((r) => {
              const busy = busyId === r.id;
              return (
                <ThemedView key={r.id} type="backgroundElement" style={styles.item}>
                  <View style={styles.itemHead}>
                    <ThemedText type="smallBold" style={styles.cat}>
                      {r.category}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: STATUS_COLOR[r.status] ?? theme.textSecondary }}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </ThemedText>
                  </View>
                  <ThemedText type="small">{r.message}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.when}>
                    {formatWhen(r.createdAt)}
                  </ThemedText>

                  {r.reply ? (
                    <View style={[styles.reply, { borderLeftColor: brandColor }]}>
                      <ThemedText type="small" themeColor="textSecondary" style={styles.replyLabel}>
                        La tua risposta
                      </ThemedText>
                      <ThemedText type="small">{r.reply}</ThemedText>
                    </View>
                  ) : null}

                  {/* Azioni sullo stato */}
                  <View style={styles.actions}>
                    <Pressable
                      disabled={busy || r.status === 'in_carico'}
                      onPress={() => patch(r.id, { status: 'in_carico' })}
                      style={[styles.actionBtn, { borderColor: theme.backgroundSelected }, (busy || r.status === 'in_carico') && styles.disabled]}>
                      <ThemedText type="small">Presa in carico</ThemedText>
                    </Pressable>
                    <Pressable
                      disabled={busy || r.status === 'completata'}
                      onPress={() => patch(r.id, { status: 'completata' })}
                      style={[styles.actionBtn, { borderColor: theme.backgroundSelected }, (busy || r.status === 'completata') && styles.disabled]}>
                      <ThemedText type="small">Completata</ThemedText>
                    </Pressable>
                  </View>

                  {/* Risposta */}
                  <TextInput
                    value={replies[r.id] ?? ''}
                    onChangeText={(t) => setReplies((p) => ({ ...p, [r.id]: t }))}
                    placeholder="Scrivi una risposta…"
                    placeholderTextColor={theme.textSecondary}
                    multiline
                    style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                  />
                  <Pressable
                    disabled={busy || !(replies[r.id] ?? '').trim()}
                    onPress={() => patch(r.id, { reply: (replies[r.id] ?? '').trim() })}
                    style={[styles.sendBtn, { backgroundColor: brandColor }, (busy || !(replies[r.id] ?? '').trim()) && styles.disabled]}>
                    {busy ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <ThemedText type="smallBold" style={styles.textLight}>
                        Invia risposta
                      </ThemedText>
                    )}
                  </Pressable>
                </ThemedView>
              );
            })
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
  item: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  itemHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  cat: { flex: 1 },
  when: { fontSize: 12 },
  reply: { borderLeftWidth: 3, paddingLeft: Spacing.two, gap: 2, marginTop: 2 },
  replyLabel: { textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
  actionBtn: { borderWidth: 1, borderRadius: 999, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one + 1 },
  input: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    fontSize: 15,
    textAlignVertical: 'top',
    marginTop: Spacing.one,
  },
  sendBtn: { borderRadius: Spacing.two, paddingVertical: Spacing.two + 2, alignItems: 'center', justifyContent: 'center', minHeight: 42 },
  disabled: { opacity: 0.5 },
  textLight: { color: '#ffffff' },
});
