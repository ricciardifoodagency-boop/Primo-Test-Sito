import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { readFile } from "fs/promises";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
// Chiave semplice condivisa con l'app mobile (ogni cliente la riceve nel proprio build,
// così solo le vostre app possono chiamare questo backend). Per un livello di sicurezza
// più alto in futuro si può passare a JWT per-cliente.
const API_KEY = process.env.PORTAL_API_KEY;

// Cache in memoria per non martellare l'API di Meta a ogni apertura app
const cache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minuti

function requireApiKey(req, res, next) {
  const key = req.header("x-api-key");
  if (!API_KEY || key !== API_KEY) {
    return res.status(401).json({ error: "Non autorizzato" });
  }
  next();
}

export async function loadClients() {
  const raw = await readFile(new URL("./clients.json", import.meta.url), "utf-8");
  return JSON.parse(raw);
}

// Snapshot dei competitor (inserzioni attive dalla Meta Ad Library). Vengono
// aggiornati "on-demand" dall'agenzia e serviti così come sono: l'endpoint
// diretto ads_archive di Meta richiede un'autorizzazione speciale dell'app, per
// questo NON interroghiamo la Ad Library in tempo reale dal backend.
export async function loadCompetitorSnapshots() {
  const raw = await readFile(
    new URL("./competitor-snapshots.json", import.meta.url),
    "utf-8"
  );
  return JSON.parse(raw);
}

// Periodi selezionabili dall'app. Mappano una chiave semplice al date_preset di
// Meta e all'etichetta mostrata all'utente.
export const RANGES = {
  "7d": { preset: "last_7d", label: "ultimi 7 giorni" },
  "30d": { preset: "last_30d", label: "ultimi 30 giorni" },
  "90d": { preset: "last_90d", label: "ultimi 90 giorni" },
  month: { preset: "this_month", label: "questo mese" },
};
const DEFAULT_RANGE = "30d";

// Normalizza il parametro `range` in ingresso: se non valido, usa il default.
export function resolveRange(range) {
  return RANGES[range] ? range : DEFAULT_RANGE;
}

export async function fetchMetaInsights(adAccountId, accessToken, datePreset = "last_30d") {
  // Endpoint Meta Marketing API: insights aggregati sul periodo scelto.
  // Documentazione: https://developers.facebook.com/docs/marketing-api/insights
  const fields = "spend,actions,impressions,cpm,reach,clicks,ctr";
  const url = `https://graph.facebook.com/v20.0/act_${adAccountId}/insights?fields=${fields}&date_preset=${datePreset}&access_token=${accessToken}`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meta API error ${res.status}: ${body}`);
  }
  const json = await res.json();
  return json.data?.[0] || null;
}

// --- Notifiche push ----------------------------------------------------------
// Store in memoria: i token dei dispositivi per cliente e lo storico notifiche
// generate a runtime. In produzione vanno persistiti su un DB (su Render il
// filesystem è effimero e si azzera a ogni deploy). Le notifiche "seed" servono
// a mostrare lo storico anche subito dopo un riavvio.
const devices = new Map(); // clientId -> Set(pushToken)
const notificationsLog = new Map(); // clientId -> [notifica, ...] (più recenti in testa)

export async function loadNotificationSeed() {
  try {
    const raw = await readFile(
      new URL("./notifications-seed.json", import.meta.url),
      "utf-8"
    );
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// Invia una notifica push ai token indicati tramite l'API push di Expo.
export async function sendExpoPush(tokens, title, body, data) {
  if (!tokens.length) return { sent: 0 };
  const messages = tokens.map((to) => ({
    to,
    title,
    body,
    sound: "default",
    data: data || {},
  }));
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(messages),
  });
  if (!res.ok) {
    throw new Error(`Expo push error ${res.status}: ${await res.text()}`);
  }
  return { sent: tokens.length, response: await res.json() };
}

// Tipi di azione che consideriamo "risultato/conversione", in ordine di priorità.
// Gli account reali ottimizzano per obiettivi diversi (acquisti, contatti/lead,
// messaggi...), quindi non ci limitiamo a "purchase": prendiamo il primo tipo
// presente seguendo questa priorità.
const RESULT_ACTION_TYPES = [
  "purchase",
  "offsite_conversion.fb_pixel_purchase",
  "onsite_conversion.purchase",
  "lead",
  "offsite_conversion.fb_pixel_lead",
  "onsite_conversion.lead_grouped",
  "onsite_conversion.messaging_conversation_started_7d",
  "link_click",
];

export function extractResults(actions, preferredType) {
  if (!Array.isArray(actions)) return 0;
  // Se il cliente ha un tipo di risultato configurato (es. "lead"), usiamo SOLO
  // quello: così il numero è coerente e confrontabile tra periodi diversi.
  // Se non è presente nel periodo, il risultato è 0 (non "ripieghiamo" su altro).
  if (preferredType) {
    const match = actions.find((a) => a.action_type === preferredType);
    return match ? Number(match.value) || 0 : 0;
  }
  // Nessuna configurazione: prendiamo la prima conversione per priorità.
  for (const type of RESULT_ACTION_TYPES) {
    const match = actions.find((a) => a.action_type === type);
    if (match) return Number(match.value) || 0;
  }
  return 0;
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Trasforma la risposta grezza di Meta nel payload compatto che l'app mobile consuma.
export function buildKpiPayload(clientId, client, insights, periodo = "ultimi 30 giorni") {
  const spend = insights ? num(insights.spend) : 0;
  const results = extractResults(insights?.actions, client.resultActionType);
  return {
    clientId,
    displayName: client.displayName,
    spend,
    impressions: insights ? num(insights.impressions) : 0,
    results,
    // Etichetta del risultato specifica del cliente (es. "Contatti"), default "Risultati".
    resultLabel: client.resultLabel || "Risultati",
    // Costo per risultato (CPA): speso / risultati. null quando non ci sono
    // risultati, per evitare divisioni per zero e mostrare "—" nell'app.
    costPerResult: results > 0 ? spend / results : null,
    // Metriche aggiuntive (usate soprattutto nel report).
    reach: insights ? num(insights.reach) : 0,
    clicks: insights ? num(insights.clicks) : 0,
    cpm: insights ? num(insights.cpm) : 0,
    ctr: insights ? num(insights.ctr) : 0,
    periodo,
    aggiornatoIl: new Date().toISOString(),
  };
}

app.get("/kpi/:clientId", requireApiKey, async (req, res) => {
  const { clientId } = req.params;
  const range = resolveRange(req.query.range);
  const { preset, label } = RANGES[range];

  try {
    const clients = await loadClients();
    const client = clients[clientId];
    if (!client) {
      return res.status(404).json({ error: "Cliente non trovato" });
    }

    // La cache tiene conto del periodo: chiavi diverse per range diversi.
    const cacheKey = `${clientId}:${range}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return res.json(cached.data);
    }

    const accessToken = process.env[client.metaAccessTokenEnvVar];
    if (!accessToken) {
      return res.status(500).json({
        error: `Token mancante in ambiente per la variabile ${client.metaAccessTokenEnvVar}`,
      });
    }

    const insights = await fetchMetaInsights(client.metaAdAccountId, accessToken, preset);
    const payload = buildKpiPayload(clientId, client, insights, label);

    cache.set(cacheKey, { data: payload, fetchedAt: Date.now() });
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore nel recupero dei dati" });
  }
});

app.get("/competitor/:clientId", requireApiKey, async (req, res) => {
  const { clientId } = req.params;
  try {
    const clients = await loadClients();
    if (!clients[clientId]) {
      return res.status(404).json({ error: "Cliente non trovato" });
    }
    const snapshots = await loadCompetitorSnapshots();
    const snapshot = snapshots[clientId];
    if (!snapshot) {
      return res
        .status(404)
        .json({ error: "Nessuno snapshot competitor per questo cliente" });
    }
    res.json(snapshot);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore nel recupero dei competitor" });
  }
});

// L'app registra il token push del dispositivo per il cliente.
app.post("/devices/:clientId", requireApiKey, async (req, res) => {
  const { clientId } = req.params;
  const token = req.body?.token;
  if (!token) return res.status(400).json({ error: "token mancante" });
  try {
    const clients = await loadClients();
    if (!clients[clientId]) {
      return res.status(404).json({ error: "Cliente non trovato" });
    }
    if (!devices.has(clientId)) devices.set(clientId, new Set());
    devices.get(clientId).add(token);
    res.json({ ok: true, registered: devices.get(clientId).size });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore nella registrazione del dispositivo" });
  }
});

// Storico notifiche del cliente (seed + quelle inviate a runtime).
app.get("/notifications/:clientId", requireApiKey, async (req, res) => {
  const { clientId } = req.params;
  try {
    const seed = await loadNotificationSeed();
    const live = notificationsLog.get(clientId) || [];
    const seeded = seed[clientId] || [];
    res.json({ notifications: [...live, ...seeded] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore nel recupero delle notifiche" });
  }
});

// L'agenzia invia una notifica al cliente: la registra nello storico e la
// spinge ai dispositivi registrati.
app.post("/notify/:clientId", requireApiKey, async (req, res) => {
  const { clientId } = req.params;
  const { title, body, data } = req.body || {};
  if (!title || !body) {
    return res.status(400).json({ error: "title e body sono richiesti" });
  }
  try {
    const clients = await loadClients();
    if (!clients[clientId]) {
      return res.status(404).json({ error: "Cliente non trovato" });
    }
    const notif = {
      id: String(Date.now()),
      title,
      body,
      data: data || null,
      sentAt: new Date().toISOString(),
    };
    const arr = notificationsLog.get(clientId) || [];
    arr.unshift(notif);
    notificationsLog.set(clientId, arr);

    const tokens = [...(devices.get(clientId) || [])];
    let push = { sent: 0 };
    try {
      push = await sendExpoPush(tokens, title, body, data);
    } catch (e) {
      // La notifica resta comunque nello storico anche se la push fallisce.
      console.error("push error:", e.message);
    }
    res.json({ ok: true, notification: notif, devices: tokens.length, push });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore nell'invio della notifica" });
  }
});

app.get("/health", (req, res) => res.json({ status: "ok" }));

// Avvia il server solo quando il file è eseguito direttamente (`node src/server.js`),
// così i test possono importare `app` senza aprire una porta.
const isDirectRun =
  process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`Backend portale clienti in ascolto sulla porta ${PORT}`);
  });
}

export { app };
