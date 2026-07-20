import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { brandColor } from '@/lib/api';

// Dati statici per ora: quando pronto, i contenuti programmati arriveranno da un
// endpoint del backend (es. GET /calendario/:clientId).
type Contenuto = {
  id: string;
  giorno: string;
  data: string;
  titolo: string;
  canale: string;
};

const PROGRAMMATI: Contenuto[] = [
  { id: 'p1', giorno: 'LUN', data: '21 lug', titolo: 'Post — Piatto del giorno', canale: 'Instagram Feed' },
  { id: 'p2', giorno: 'MAR', data: '22 lug', titolo: 'Reel — Taco Tuesday', canale: 'Instagram Reel' },
  { id: 'p3', giorno: 'GIO', data: '24 lug', titolo: 'Carosello — Nuovo menù estivo', canale: 'Facebook + Instagram' },
  { id: 'p4', giorno: 'VEN', data: '25 lug', titolo: 'Storia — Aperitivo messicano', canale: 'Instagram Story' },
  { id: 'p5', giorno: 'SAB', data: '26 lug', titolo: 'Post — Serata live musica', canale: 'Facebook Feed' },
];

export default function CalendarioScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <ThemedText type="subtitle">Calendario</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Contenuti programmati questa settimana
          </ThemedText>

          {PROGRAMMATI.map((c) => (
            <ThemedView key={c.id} type="backgroundElement" style={styles.row}>
              <View style={[styles.dateBox, { backgroundColor: brandColor }]}>
                <ThemedText type="small" style={styles.dateGiorno}>
                  {c.giorno}
                </ThemedText>
                <ThemedText type="smallBold" style={styles.dateData}>
                  {c.data}
                </ThemedText>
              </View>
              <View style={styles.rowBody}>
                <ThemedText type="smallBold">{c.titolo}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {c.canale}
                </ThemedText>
              </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  dateBox: {
    width: 58,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateGiorno: { color: '#ffffff', letterSpacing: 1 },
  dateData: { color: '#ffffff' },
  rowBody: { flex: 1, gap: 2 },
});
