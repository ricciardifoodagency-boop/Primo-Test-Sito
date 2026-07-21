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
import { CATEGORIES, fetchRequests, sendRequest, type ClientRequest } from '@/lib/requests';

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

export default function RichiesteScreen() {
  const theme = useTheme();
  const [items, setItems] = useState<ClientRequest[]>([]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setItems(await fetchRequests());
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

  const onSend = useCallback(async () => {
    if (!message.trim()) {
      Alert.alert('Scrivi un messaggio', 'Aggiungi il testo della richiesta prima di inviare.');
      return;
    }
    setSending(true);
    try {
      const created = await sendRequest(category, message.trim());
      setItems((prev) => [created, ...prev]);
      setMessage('');
      Alert.alert('Richiesta inviata', "L'agenzia ti risponderà a breve.");
    } catch (e) {
      Alert.alert('Errore', e instanceof Error ? e.message : 'Riprova più tardi.');
    } finally {
      setSending(false);
    }
  }, [category, message]);

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
          <ThemedText type="subtitle">Richieste</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Scrivi all'agenzia direttamente da qui.
          </ThemedText>

          {/* Form nuova richiesta */}
          <ThemedView type="backgroundElement" style={styles.form}>
            <View style={styles.chips}>
              {CATEGORIES.map((c) => {
                const active = c === category;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    style={[
                      styles.chip,
                      { borderColor: theme.backgroundSelected },
                      active && { backgroundColor: brandColor, borderColor: brandColor },
                    ]}>
                    <ThemedText
                      type="small"
                      themeColor={active ? undefined : 'textSecondary'}
                      style={active ? styles.chipTextActive : undefined}>
                      {c}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Scrivi la tua richiesta…"
              placeholderTextColor={theme.textSecondary}
              multiline
              style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
            />

            <Pressable
              onPress={onSend}
              disabled={sending}
              style={[styles.sendBtn, { backgroundColor: brandColor }, sending && styles.disabled]}>
              {sending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <ThemedText type="smallBold" style={styles.textLight}>
                  Invia richiesta
                </ThemedText>
              )}
            </Pressable>
          </ThemedView>

          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.histTitle}>
            LE TUE RICHIESTE
          </ThemedText>

          {error ? (
            <ThemedText type="small" themeColor="textSecondary">
              {error}
            </ThemedText>
          ) : items.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Nessuna richiesta ancora.
            </ThemedText>
          ) : (
            items.map((r) => (
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
                {r.reply && (
                  <View style={[styles.reply, { borderLeftColor: brandColor }]}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.replyLabel}>
                      Risposta agenzia
                    </ThemedText>
                    <ThemedText type="small">{r.reply}</ThemedText>
                  </View>
                )}
                <ThemedText type="small" themeColor="textSecondary" style={styles.when}>
                  {formatWhen(r.createdAt)}
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
  form: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.three },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one + 1 },
  chipTextActive: { color: '#ffffff', fontWeight: '700' },
  input: {
    minHeight: 90,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  sendBtn: { borderRadius: Spacing.two, paddingVertical: Spacing.three, alignItems: 'center', justifyContent: 'center', minHeight: 46 },
  disabled: { opacity: 0.7 },
  textLight: { color: '#ffffff' },
  histTitle: { letterSpacing: 0.5, marginTop: Spacing.two },
  item: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  itemHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  cat: { flex: 1 },
  reply: { borderLeftWidth: 3, paddingLeft: Spacing.two, gap: 2, marginTop: 2 },
  replyLabel: { textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.4 },
  when: { fontSize: 12 },
});
