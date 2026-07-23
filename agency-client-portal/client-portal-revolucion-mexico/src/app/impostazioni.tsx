// Impostazioni. Per ora contiene il "Cambia ruolo" (funzione temporanea per i
// test: nella versione definitiva la toglieremo).

import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { brandColor } from '@/lib/api';
import { useRole } from '@/lib/role-context';

export default function ImpostazioniScreen() {
  const theme = useTheme();
  const { config, resetRole } = useRole();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <ThemedText type="subtitle">Impostazioni</ThemedText>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
              ACCOUNT ATTUALE
            </ThemedText>
            <ThemedText type="title">
              {config ? `${config.emoji} ${config.label}` : '—'}
            </ThemedText>
            {config ? (
              <ThemedText type="small" themeColor="textSecondary">
                {config.description}
              </ThemedText>
            ) : null}
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Cambia tipo di account</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Funzione temporanea per i test. Tornerai alla schermata di scelta del ruolo
              (per i ruoli interni serve di nuovo il PIN).
            </ThemedText>
            <Pressable onPress={() => resetRole()} style={[styles.btn, { backgroundColor: brandColor }]}>
              <ThemedText type="smallBold" style={styles.textLight}>
                Cambia ruolo
              </ThemedText>
            </Pressable>
          </ThemedView>

          <View style={styles.footer}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Ricciardi Food Agency · Portale clienti
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: { padding: Spacing.four, gap: Spacing.three },
  card: { borderRadius: Spacing.three, padding: Spacing.four, gap: Spacing.two },
  label: { letterSpacing: 0.5 },
  btn: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    marginTop: Spacing.one,
  },
  textLight: { color: '#ffffff' },
  footer: { alignItems: 'center', marginTop: Spacing.four },
});
