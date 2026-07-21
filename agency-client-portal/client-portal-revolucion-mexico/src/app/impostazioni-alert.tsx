import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { brandColor } from '@/lib/api';
import { fetchAlerts, saveAlerts, type AlertConfig, type AlertDef } from '@/lib/alerts';

const GROUP_ORDER = ['Performance', 'Budget', 'Operativo', 'Competitor'];

export default function ImpostazioniAlertScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [defs, setDefs] = useState<AlertDef[]>([]);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [thresholds, setThresholds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { defs: d, config } = await fetchAlerts();
      setDefs(d);
      const en: Record<string, boolean> = {};
      const th: Record<string, string> = {};
      d.forEach((def) => {
        en[def.id] = config[def.id]?.enabled ?? true;
        if (def.kind === 'threshold') {
          th[def.id] = String(config[def.id]?.threshold ?? def.default ?? 0);
        }
      });
      setEnabled(en);
      setThresholds(th);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSave = useCallback(async () => {
    setSaving(true);
    try {
      const config: AlertConfig = {};
      defs.forEach((def) => {
        config[def.id] =
          def.kind === 'threshold'
            ? {
                enabled: enabled[def.id],
                threshold: Number(String(thresholds[def.id]).replace(',', '.')) || 0,
              }
            : { enabled: enabled[def.id] };
      });
      await saveAlerts(config);
      Alert.alert('Salvato', 'Le impostazioni degli alert sono state aggiornate.');
    } catch (e) {
      Alert.alert('Errore', e instanceof Error ? e.message : 'Riprova più tardi.');
    } finally {
      setSaving(false);
    }
  }, [defs, enabled, thresholds]);

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={brandColor} />
      </ThemedView>
    );
  }

  const groups = GROUP_ORDER.filter((g) => defs.some((d) => d.group === g));

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ThemedText type="link" style={{ color: brandColor }}>
              ‹ Indietro
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <ThemedText type="subtitle">Impostazioni alert</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Scegli quali avvisi ricevere e imposta le soglie.
          </ThemedText>

          {error ? (
            <ThemedView type="backgroundElement" style={styles.row}>
              <ThemedText type="small" themeColor="textSecondary">
                {error}
              </ThemedText>
            </ThemedView>
          ) : (
            groups.map((group) => (
              <View key={group} style={styles.group}>
                <ThemedText type="smallBold" themeColor="textSecondary" style={styles.groupTitle}>
                  {group.toUpperCase()}
                </ThemedText>
                {defs
                  .filter((d) => d.group === group)
                  .map((def) => (
                    <ThemedView key={def.id} type="backgroundElement" style={styles.row}>
                      <View style={styles.rowTop}>
                        <View style={styles.rowText}>
                          <ThemedText type="smallBold">{def.label}</ThemedText>
                          <ThemedText type="small" themeColor="textSecondary" style={styles.desc}>
                            {def.desc}
                          </ThemedText>
                        </View>
                        <Switch
                          value={enabled[def.id]}
                          onValueChange={(v) => setEnabled((s) => ({ ...s, [def.id]: v }))}
                          trackColor={{ true: brandColor }}
                        />
                      </View>

                      {def.kind === 'threshold' && enabled[def.id] && (
                        <View style={styles.thresholdRow}>
                          <ThemedText type="small" themeColor="textSecondary">
                            Soglia
                          </ThemedText>
                          <View style={[styles.inputWrap, { borderColor: theme.backgroundSelected }]}>
                            {def.unit === '€' && <ThemedText type="small">€</ThemedText>}
                            <TextInput
                              value={thresholds[def.id]}
                              onChangeText={(t) => setThresholds((s) => ({ ...s, [def.id]: t }))}
                              keyboardType="numeric"
                              style={[styles.input, { color: theme.text }]}
                              placeholderTextColor={theme.textSecondary}
                            />
                            {def.unit === '%' && <ThemedText type="small">%</ThemedText>}
                          </View>
                        </View>
                      )}
                    </ThemedView>
                  ))}
              </View>
            ))
          )}

          <Pressable
            onPress={onSave}
            disabled={saving}
            style={[styles.saveBtn, { backgroundColor: brandColor }, saving && styles.saveDisabled]}>
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText type="smallBold" style={styles.textLight}>
                Salva impostazioni
              </ThemedText>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
  scroll: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  group: { gap: Spacing.two },
  groupTitle: { letterSpacing: 0.5, marginTop: Spacing.two },
  row: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  rowText: { flex: 1, gap: 2 },
  desc: { lineHeight: 18 },
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    minWidth: 110,
  },
  input: { flex: 1, paddingVertical: 8, fontSize: 16, fontWeight: '600', textAlign: 'right' },
  saveBtn: {
    marginTop: Spacing.three,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  saveDisabled: { opacity: 0.7 },
  textLight: { color: '#ffffff' },
});
