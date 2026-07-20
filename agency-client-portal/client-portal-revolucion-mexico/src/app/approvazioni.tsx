import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { brandColor } from '@/lib/api';

// Dati statici per ora: quando pronto, questi arriveranno da un endpoint del
// backend simile a /kpi (es. GET /creativita/:clientId).
type Stato = 'in_attesa' | 'approvata' | 'rifiutata';

type Creativita = {
  id: string;
  titolo: string;
  formato: string;
  pianificata: string;
  stato: Stato;
};

const INIZIALI: Creativita[] = [
  { id: 'c1', titolo: 'Reel — Taco Tuesday', formato: 'Reel 9:16', pianificata: 'Mar 22 lug', stato: 'in_attesa' },
  { id: 'c2', titolo: 'Carosello — Nuovo menù estivo', formato: 'Carosello', pianificata: 'Gio 24 lug', stato: 'in_attesa' },
  { id: 'c3', titolo: 'Storia — Aperitivo messicano', formato: 'Story 9:16', pianificata: 'Ven 25 lug', stato: 'in_attesa' },
];

const STATO_LABEL: Record<Stato, string> = {
  in_attesa: 'In attesa',
  approvata: 'Approvata',
  rifiutata: 'Rifiutata',
};

const STATO_COLORE: Record<Stato, string> = {
  in_attesa: '#B0740B',
  approvata: '#1F7A3D',
  rifiutata: '#B3261E',
};

export default function ApprovazioniScreen() {
  const [items, setItems] = useState<Creativita[]>(INIZIALI);

  const aggiorna = (id: string, stato: Stato) =>
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, stato } : c)));

  const inAttesa = items.filter((c) => c.stato === 'in_attesa').length;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <ThemedText type="subtitle">Approvazioni</ThemedText>
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
                    onPress={() => aggiorna(c.id, 'approvata')}
                    style={[styles.btn, { backgroundColor: brandColor }]}>
                    <ThemedText type="smallBold" style={styles.btnTextLight}>
                      Approva
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => aggiorna(c.id, 'rifiutata')}
                    style={[styles.btn, styles.btnGhost, { borderColor: STATO_COLORE.rifiutata }]}>
                    <ThemedText type="smallBold" style={{ color: STATO_COLORE.rifiutata }}>
                      Rifiuta
                    </ThemedText>
                  </Pressable>
                </View>
              )}
            </ThemedView>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  card: { borderRadius: Spacing.three, padding: Spacing.four, gap: Spacing.two },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  cardTitle: { flex: 1 },
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  btn: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderRadius: Spacing.two },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1 },
  btnTextLight: { color: '#ffffff' },
});
