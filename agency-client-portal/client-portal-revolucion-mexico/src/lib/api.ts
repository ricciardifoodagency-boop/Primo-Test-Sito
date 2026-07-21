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
export const apiKey = extra.apiKey ?? "";

// Periodi selezionabili nella dashboard. La chiave viene passata al backend
// (?range=...), l'etichetta è per i pulsanti.
export type RangeKey = "7d" | "30d" | "90d" | "month";
export const RANGES: { key: RangeKey; label: string }[] = [
  { key: "7d", label: "7 giorni" },
  { key: "30d", label: "30 giorni" },
  { key: "90d", label: "90 giorni" },
  { key: "month", label: "Questo mese" },
];

export type Kpi = {
  clientId: string;
  displayName: string;
  spend: number;
  impressions: number;
  results: number;
  resultLabel: string;
  costPerResult: number | null;
  reach: number;
  clicks: number;
  cpm: number;
  ctr: number;
  periodo: string;
  aggiornatoIl: string;
};

export async function fetchKpi(range: RangeKey = "30d"): Promise<Kpi> {
  const res = await fetch(`${backendUrl}/kpi/${clientId}?range=${range}`, {
    headers: {
      // In produzione questa chiave va gestita con più cura (es. certificate
      // pinning, o un token per-installazione da un flusso di login leggero).
      "x-api-key": extra.apiKey ?? "",
    },
  });

  if (!res.ok) {
    throw new Error(`Errore recupero KPI: ${res.status}`);
  }

  return res.json() as Promise<Kpi>;
}

// --- Competitor (Meta Ad Library, snapshot on-demand) ------------------------

export type CompetitorAd = {
  title: string | null;
  startTime: number; // unix (secondi)
  snapshotUrl: string;
};

export type Competitor = {
  name: string;
  pageId: string;
  activeAds: number;
  ads: CompetitorAd[];
};

export type CompetitorSnapshot = {
  refreshedAt: string;
  competitors: Competitor[];
};

export async function fetchCompetitors(): Promise<CompetitorSnapshot> {
  const res = await fetch(`${backendUrl}/competitor/${clientId}`, {
    headers: { "x-api-key": apiKey },
  });

  if (!res.ok) {
    throw new Error(`Errore recupero competitor: ${res.status}`);
  }

  return res.json() as Promise<CompetitorSnapshot>;
}

// --- Creatività (Approvazioni) e Calendario ----------------------------------

export type CreativeStatus = 'in_attesa' | 'approvata' | 'rifiutata';
export type Creative = {
  id: string;
  titolo: string;
  formato: string;
  pianificata: string;
  stato: CreativeStatus;
  mediaUrl?: string;
};

export async function fetchCreatives(): Promise<Creative[]> {
  const res = await fetch(`${backendUrl}/creatives/${clientId}`, {
    headers: { 'x-api-key': apiKey },
  });
  if (!res.ok) throw new Error(`Errore recupero creatività: ${res.status}`);
  const json = (await res.json()) as { creatives: Creative[] };
  return json.creatives;
}

export async function updateCreativeStatus(id: string, stato: CreativeStatus): Promise<void> {
  const res = await fetch(`${backendUrl}/creatives/${clientId}/${id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ stato }),
  });
  if (!res.ok) throw new Error(`Errore aggiornamento creatività: ${res.status}`);
}

export type CalendarItem = {
  id: string;
  giorno: string;
  data: string;
  titolo: string;
  canale: string;
};

export async function fetchCalendar(): Promise<CalendarItem[]> {
  const res = await fetch(`${backendUrl}/calendar/${clientId}`, {
    headers: { 'x-api-key': apiKey },
  });
  if (!res.ok) throw new Error(`Errore recupero calendario: ${res.status}`);
  const json = (await res.json()) as { calendar: CalendarItem[] };
  return json.calendar;
}

// --- Notifiche ---------------------------------------------------------------

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  data?: unknown;
  sentAt: string;
};

// Registra il token push del dispositivo sul backend (best-effort).
export async function registerDevice(token: string): Promise<void> {
  await fetch(`${backendUrl}/devices/${clientId}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({ token }),
  });
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  const res = await fetch(`${backendUrl}/notifications/${clientId}`, {
    headers: { "x-api-key": apiKey },
  });
  if (!res.ok) {
    throw new Error(`Errore recupero notifiche: ${res.status}`);
  }
  const json = (await res.json()) as { notifications: AppNotification[] };
  return json.notifications;
}
