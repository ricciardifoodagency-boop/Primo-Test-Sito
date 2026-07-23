// Schermata di scelta del tipo di account (primo avvio o cambio ruolo).
// Ristoratore/Negoziante è libero; gli altri ruoli richiedono il PIN.

import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from './themed-text';

import { brandColor } from '@/lib/api';
import { useRole } from '@/lib/role-context';
import { checkPin, ROLE_ORDER, ROLES, type Role } from '@/lib/role';

export function RolePicker({ onClose }: { onClose?: () => void }) {
  const { setRole } = useRole();
  const [pinFor, setPinFor] = useState<Role | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Applica il ruolo. Restiamo su '/' (home): i ruoli con Dashboard la vedono;
  // per l'Addetto (senza Dashboard) ci pensa il guard di rotta a rimandare alla
  // prima sezione consentita.
  const apply = async (role: Role) => {
    setBusy(true);
    await setRole(role);
    onClose?.();
  };

  const choose = async (role: Role) => {
    if (ROLES[role].internal) {
      setPinFor(role);
      setPin('');
      setError(null);
      return;
    }
    await apply(role);
  };

  const confirmPin = async () => {
    if (!pinFor) return;
    if (!checkPin(pin)) {
      setError('PIN errato. Riprova.');
      return;
    }
    await apply(pinFor);
  };

  return (
    <View style={styles.overlay}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.brandRow}>
          <View style={[styles.dot, { backgroundColor: brandColor }]} />
          <ThemedText type="smallBold" style={styles.white}>
            Ricciardi Food Agency
          </ThemedText>
        </View>

        {pinFor ? (
          // --- Inserimento PIN per un ruolo interno ---
          <View style={styles.pinBox}>
            <ThemedText type="title" style={styles.white}>
              {ROLES[pinFor].emoji} {ROLES[pinFor].label}
            </ThemedText>
            <ThemedText type="small" style={styles.muted}>
              Ruolo riservato: inserisci il PIN per continuare.
            </ThemedText>
            <TextInput
              value={pin}
              onChangeText={(t) => {
                setPin(t);
                setError(null);
              }}
              placeholder="PIN"
              placeholderTextColor="rgba(255,255,255,0.4)"
              keyboardType="number-pad"
              secureTextEntry
              autoFocus
              style={styles.pinInput}
              onSubmitEditing={confirmPin}
            />
            {error ? (
              <ThemedText type="small" style={styles.error}>
                {error}
              </ThemedText>
            ) : null}
            <Pressable
              onPress={confirmPin}
              disabled={busy}
              style={[styles.primaryBtn, { backgroundColor: brandColor }, busy && styles.disabled]}>
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText type="smallBold" style={styles.white}>
                  Entra come {ROLES[pinFor].label}
                </ThemedText>
              )}
            </Pressable>
            <Pressable onPress={() => setPinFor(null)} disabled={busy} style={styles.backBtn}>
              <ThemedText type="small" style={styles.muted}>
                ‹ Indietro
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          // --- Elenco ruoli ---
          <>
            <ThemedText type="title" style={styles.white}>
              Scegli il tipo di account
            </ThemedText>
            <ThemedText type="small" style={styles.muted}>
              Determina quali sezioni vedrai e dove arrivano le tue richieste.
            </ThemedText>

            {ROLE_ORDER.map((r) => {
              const c = ROLES[r];
              return (
                <Pressable
                  key={r}
                  onPress={() => choose(r)}
                  disabled={busy}
                  style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
                  <ThemedText type="subtitle" style={styles.white}>
                    {c.emoji} {c.label}
                    {c.internal ? '  🔒' : ''}
                  </ThemedText>
                  <ThemedText type="small" style={styles.muted}>
                    {c.description}
                  </ThemedText>
                </Pressable>
              );
            })}

            {onClose ? (
              <Pressable onPress={onClose} style={styles.backBtn}>
                <ThemedText type="small" style={styles.muted}>
                  Annulla
                </ThemedText>
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0B0B0C',
    zIndex: 900,
  },
  scroll: {
    padding: 20,
    paddingTop: 48,
    gap: 14,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  white: { color: '#ffffff' },
  muted: { color: 'rgba(255,255,255,0.65)' },
  error: { color: '#FF7A7A' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  pressed: { opacity: 0.7 },
  pinBox: { gap: 12, marginTop: 8 },
  pinInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 14,
    fontSize: 22,
    letterSpacing: 6,
    color: '#ffffff',
    textAlign: 'center',
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  disabled: { opacity: 0.7 },
  backBtn: { alignItems: 'center', paddingVertical: 10 },
});
