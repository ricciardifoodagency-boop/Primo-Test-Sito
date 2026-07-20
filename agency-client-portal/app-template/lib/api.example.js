// Copia in lib/api.js dentro il progetto Expo.
// Recupera i KPI del cliente configurato in app.config.js, chiamando il vostro backend.

import Constants from "expo-constants";

const { clientId, backendUrl } = Constants.expoConfig.extra;

export async function fetchKpi() {
  const res = await fetch(`${backendUrl}/kpi/${clientId}`, {
    headers: {
      // In produzione questa chiave va gestita con più cura (es. certificate pinning,
      // o un token per-installazione ottenuto tramite un flusso di login leggero).
      "x-api-key": Constants.expoConfig.extra.apiKey,
    },
  });

  if (!res.ok) {
    throw new Error(`Errore recupero KPI: ${res.status}`);
  }

  return res.json();
  // Risposta attesa: { clientId, displayName, spend, impressions, results, periodo, aggiornatoIl }
}
