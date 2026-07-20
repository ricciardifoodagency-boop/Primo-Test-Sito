// Recupera i KPI del cliente configurato in app.config.js, chiamando il vostro
// backend. Il token Meta resta SEMPRE solo sul backend, mai nell'app.

import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as {
  clientId?: string;
  backendUrl?: string;
  apiKey?: string;
  brandColor?: string;
};

export const clientId = extra.clientId ?? "";
export const backendUrl = extra.backendUrl ?? "";
export const brandColor = extra.brandColor ?? "#C1121F";

export type Kpi = {
  clientId: string;
  displayName: string;
  spend: number;
  impressions: number;
  results: number;
  costPerResult: number | null;
  periodo: string;
  aggiornatoIl: string;
};

export async function fetchKpi(): Promise<Kpi> {
  const res = await fetch(`${backendUrl}/kpi/${clientId}`, {
    headers: {
      // In produzione questa chiave va gestita con più cura (es. certificate
      // pinning, o un token per-installazione da un flusso di login leggero).
      "x-api-key": extra.apiKey ?? "",
    },
  });

  if (!res.ok) {
    throw new Error(`Errore recupero KPI: ${res.status}`);
  }

  // Risposta attesa dal backend:
  // { clientId, displayName, spend, impressions, results, periodo, aggiornatoIl }
  return res.json() as Promise<Kpi>;
}
