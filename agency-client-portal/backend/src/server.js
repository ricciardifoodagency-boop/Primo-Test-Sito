import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import * as store from "./store.js";

dotenv.config();

// Attiva Firestore se è configurata la chiave di servizio (FIREBASE_SERVICE_ACCOUNT).
// Senza, il backend usa store in memoria + seed (utile per test/sviluppo locale).
store.initFirestore();

const app = express();
app.use(cors());
app.use(express.json());

// Versione web dell'app (export statico Expo) servita sotto /app.
// `extensions: ["html"]` serve /app/notifiche -> notifiche.html, ecc.
const webDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "app");
app.use("/app", express.static(webDir, { extensions: ["html"] }));

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

export async function fetchMetaInsights(adAccountId, accessToken, dateOrOpts = "last_30d") {
  // Endpoint Meta Marketing API: insights aggregati sul periodo scelto.
  // Documentazione: https://developers.facebook.com/docs/marketing-api/insights
  // `dateOrOpts` può essere una stringa (date_preset) o { timeRange: {since, until} }.
  const opts = typeof dateOrOpts === "string" ? { datePreset: dateOrOpts } : dateOrOpts;
  const fields = "spend,actions,impressions,cpm,reach,clicks,ctr";
  const dateParam = opts.timeRange
    ? `time_range=${encodeURIComponent(JSON.stringify(opts.timeRange))}`
    : `date_preset=${opts.datePreset || "last_30d"}`;
  const url = `https://graph.facebook.com/v20.0/act_${adAccountId}/insights?fields=${fields}&${dateParam}&access_token=${accessToken}`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meta API error ${res.status}: ${body}`);
  }
  const json = await res.json();
  return json.data?.[0] || null;
}

// --- Notifiche push ----------------------------------------------------------
// I dati (dispositivi, notifiche, richieste, config alert) sono gestiti da
// ./store.js: Firestore se configurato (persistente), altrimenti in memoria.

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

// Invia un'email di notifica via Resend a un indirizzo specifico.
// Attiva solo se sono configurate RESEND_API_KEY e il destinatario; altrimenti no-op.
async function sendEmailTo(to, subject, text) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return { skipped: true };
  const from = process.env.EMAIL_FROM || "Portale Clienti <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to, subject, text }),
  });
  if (!res.ok) {
    throw new Error(`Resend error ${res.status}: ${await res.text()}`);
  }
  return { sent: true };
}

// Notifica all'agenzia (richieste "all'agenzia" dei clienti).
export async function sendAgencyEmail(subject, text) {
  return sendEmailTo(process.env.AGENCY_EMAIL, subject, text);
}

// Notifica al developer (richieste "al developer" e ticket). Se DEVELOPER_EMAIL
// non è configurata ripiega sull'indirizzo dell'agenzia, così l'avviso arriva
// comunque (il testo completo resta consultabile in app).
export async function sendDeveloperEmail(subject, text) {
  return sendEmailTo(process.env.DEVELOPER_EMAIL || process.env.AGENCY_EMAIL, subject, text);
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

// --- Alert automatici sui KPI ------------------------------------------------
// Catalogo degli alert. `kind`: "threshold" (valore impostabile) o "toggle".
export const ALERT_DEFS = [
  { id: "ctr_low", label: "CTR basso", kind: "threshold", unit: "%", default: 15, group: "Performance", desc: "CTR sceso oltre X% vs settimana scorsa" },
  { id: "cpa_high", label: "Costo per risultato alto", kind: "threshold", unit: "€", default: 5, group: "Performance", desc: "Costo per risultato sopra € X" },
  { id: "results_down", label: "Risultati in calo", kind: "threshold", unit: "%", default: 30, group: "Performance", desc: "Contatti scesi oltre X% vs settimana scorsa" },
  { id: "spend_high", label: "Budget superato", kind: "threshold", unit: "€", default: 1000, group: "Budget", desc: "Spesa del mese sopra € X" },
  { id: "spend_zero", label: "Spesa ferma", kind: "toggle", group: "Budget", desc: "Nessuna spesa negli ultimi 3 giorni" },
  { id: "reach_drop", label: "Copertura crollata", kind: "toggle", group: "Performance", desc: "Copertura scesa molto vs settimana scorsa" },
  { id: "new_creatives", label: "Creatività da approvare", kind: "toggle", group: "Operativo", desc: "Nuovi contenuti in attesa di approvazione" },
  { id: "monthly_report", label: "Report mensile pronto", kind: "toggle", group: "Operativo", desc: "Report pronto a inizio mese" },
  { id: "competitor_surge", label: "Competitor in movimento", kind: "toggle", group: "Competitor", desc: "Un competitor ha aumentato le inserzioni" },
];

export function defaultAlertConfig() {
  const cfg = {};
  for (const a of ALERT_DEFS) {
    cfg[a.id] = a.kind === "threshold" ? { enabled: true, threshold: a.default } : { enabled: true };
  }
  return cfg;
}

const alertState = new Map(); // clientId -> Set(ruleId attivi) per anti-spam (transitorio)

// Config alert del cliente: dallo store (Firestore o memoria) o i default.
export async function getAlertConfig(clientId) {
  return (await store.getStoredAlertConfig(clientId)) || defaultAlertConfig();
}

// Valida e normalizza la config in arrivo dall'app (accetta solo id noti).
export function sanitizeAlertConfig(input) {
  const base = defaultAlertConfig();
  if (!input || typeof input !== "object") return base;
  for (const a of ALERT_DEFS) {
    const incoming = input[a.id];
    if (!incoming || typeof incoming !== "object") continue;
    base[a.id].enabled = Boolean(incoming.enabled);
    if (a.kind === "threshold") {
      const t = Number(incoming.threshold);
      if (Number.isFinite(t) && t >= 0) base[a.id].threshold = t;
    }
  }
  return base;
}

function eur(n) {
  return "€ " + Number(n).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function pctLabel(n) {
  return Number(n).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
}

// Funzione PURA: dato config + metriche, ritorna gli alert scattati. Testabile
// senza rete.
export function checkAlertRules(config, m) {
  const out = [];
  const on = (id) => config[id] && config[id].enabled;
  const thr = (id) => Number(config[id]?.threshold);

  if (on("ctr_low") && m.ctrPrev > 0 && m.ctrCur < m.ctrPrev * (1 - thr("ctr_low") / 100)) {
    out.push({ id: "ctr_low", title: "CTR in calo ⚠️",
      body: `Il CTR è sceso a ${pctLabel(m.ctrCur)} (era ${pctLabel(m.ctrPrev)} la settimana scorsa), oltre il ${thr("ctr_low")}% di calo impostato.` });
  }
  if (on("cpa_high") && m.resCur > 0 && m.cpaCur > thr("cpa_high")) {
    out.push({ id: "cpa_high", title: "Costo per risultato alto ⚠️",
      body: `Il costo per risultato è ${eur(m.cpaCur)}, sopra la soglia di ${eur(thr("cpa_high"))}.` });
  }
  if (on("results_down") && m.resPrev > 0 && m.resCur < m.resPrev * (1 - thr("results_down") / 100)) {
    out.push({ id: "results_down", title: "Risultati in calo ⚠️",
      body: `I contatti sono scesi a ${m.resCur} (erano ${m.resPrev} la settimana scorsa), oltre il ${thr("results_down")}% di calo impostato.` });
  }
  if (on("spend_high") && m.monthSpend > thr("spend_high")) {
    out.push({ id: "spend_high", title: "Budget superato 💸",
      body: `La spesa del mese è ${eur(m.monthSpend)}, sopra il budget di ${eur(thr("spend_high"))}.` });
  }
  if (on("spend_zero") && m.last3Spend === 0) {
    out.push({ id: "spend_zero", title: "Campagne ferme ⛔",
      body: "Nessuna spesa negli ultimi 3 giorni: le campagne potrebbero essere spente." });
  }
  if (on("reach_drop") && m.reachPrev > 0 && m.reachCur < m.reachPrev * 0.6) {
    out.push({ id: "reach_drop", title: "Copertura in calo",
      body: `La copertura è scesa a ${m.reachCur.toLocaleString("it-IT")} (era ${m.reachPrev.toLocaleString("it-IT")}).` });
  }
  return out;
}

// Data (YYYY-MM-DD) a partire da uno scostamento in giorni da oggi.
function ymdDaysAgo(days) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

// Legge i KPI da Meta, calcola le metriche e valuta gli alert. Invia notifica
// per quelli appena scattati (anti-spam: non ripete finché non rientrano).
export async function evaluateAlerts(clientId) {
  const clients = await loadClients();
  const client = clients[clientId];
  if (!client) throw new Error("Cliente non trovato");
  const token = process.env[client.metaAccessTokenEnvVar];
  if (!token) throw new Error("Token mancante");
  const acc = client.metaAdAccountId;

  const cur = await fetchMetaInsights(acc, token, { timeRange: { since: ymdDaysAgo(7), until: ymdDaysAgo(1) } });
  const prev = await fetchMetaInsights(acc, token, { timeRange: { since: ymdDaysAgo(14), until: ymdDaysAgo(8) } });
  const month = await fetchMetaInsights(acc, token, "this_month");
  const last3 = await fetchMetaInsights(acc, token, { timeRange: { since: ymdDaysAgo(3), until: ymdDaysAgo(1) } });

  const resCur = extractResults(cur?.actions, client.resultActionType);
  const resPrev = extractResults(prev?.actions, client.resultActionType);
  const spendCur = cur ? num(cur.spend) : 0;
  const metrics = {
    ctrCur: cur ? num(cur.ctr) : 0,
    ctrPrev: prev ? num(prev.ctr) : 0,
    resCur,
    resPrev,
    cpaCur: resCur > 0 ? spendCur / resCur : 0,
    monthSpend: month ? num(month.spend) : 0,
    last3Spend: last3 ? num(last3.spend) : 0,
    reachCur: cur ? num(cur.reach) : 0,
    reachPrev: prev ? num(prev.reach) : 0,
  };

  const triggered = checkAlertRules(await getAlertConfig(clientId), metrics);

  const active = alertState.get(clientId) || new Set();
  const fresh = triggered.filter((t) => !active.has(t.id));
  alertState.set(clientId, new Set(triggered.map((t) => t.id)));

  const tokens = await store.getDeviceTokens(clientId);
  for (const t of fresh) {
    const notif = {
      id: String(Date.now()) + "-" + t.id,
      title: t.title,
      body: t.body,
      data: { type: "alert", alert: t.id },
      sentAt: new Date().toISOString(),
    };
    await store.addNotification(clientId, notif);
    try {
      await sendExpoPush(tokens, t.title, t.body, notif.data);
    } catch (e) {
      console.error("push error:", e.message);
    }
  }
  return { metrics, triggered, notified: fresh.length };
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
    const registered = await store.addDevice(clientId, token);
    res.json({ ok: true, registered });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore nella registrazione del dispositivo" });
  }
});

// Storico notifiche del cliente (seed + quelle inviate a runtime).
app.get("/notifications/:clientId", requireApiKey, async (req, res) => {
  const { clientId } = req.params;
  try {
    res.json({ notifications: await store.listNotifications(clientId) });
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
    await store.addNotification(clientId, notif);

    const tokens = await store.getDeviceTokens(clientId);
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

// Configurazione alert del cliente (catalogo + valori attuali).
app.get("/alerts/:clientId", requireApiKey, async (req, res) => {
  try {
    const clients = await loadClients();
    if (!clients[req.params.clientId]) {
      return res.status(404).json({ error: "Cliente non trovato" });
    }
    res.json({ defs: ALERT_DEFS, config: await getAlertConfig(req.params.clientId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore nel recupero degli alert" });
  }
});

// Salva la configurazione alert (attivazioni + soglie) modificata dall'app.
app.put("/alerts/:clientId", requireApiKey, async (req, res) => {
  try {
    const clients = await loadClients();
    if (!clients[req.params.clientId]) {
      return res.status(404).json({ error: "Cliente non trovato" });
    }
    const config = sanitizeAlertConfig(req.body?.config);
    await store.setStoredAlertConfig(req.params.clientId, config);
    res.json({ ok: true, config });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore nel salvataggio degli alert" });
  }
});

// Esegue il controllo degli alert (lo chiama un cron giornaliero sul server).
app.post("/alerts/:clientId/run", requireApiKey, async (req, res) => {
  try {
    res.json(await evaluateAlerts(req.params.clientId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Errore nel controllo degli alert" });
  }
});

// Storico richieste del cliente (live + seed), più recenti in testa.
app.get("/requests/:clientId", requireApiKey, async (req, res) => {
  const { clientId } = req.params;
  // Filtro opzionale per destinazione: "agency" (richieste all'agenzia) o
  // "developer" (richieste al developer / ticket). Le richieste legacy senza
  // campo "stream" sono trattate come "agency".
  const stream = req.query.stream;
  try {
    const clients = await loadClients();
    if (!clients[clientId]) {
      return res.status(404).json({ error: "Cliente non trovato" });
    }
    let requests = await store.listRequests(clientId);
    if (stream === "agency" || stream === "developer") {
      requests = requests.filter((r) => (r.stream || "agency") === stream);
    }
    res.json({ requests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore nel recupero delle richieste" });
  }
});

// Un utente invia una nuova richiesta. Il campo "stream" decide la destinazione:
//  - "agency"    -> richiesta all'agenzia (default, comportamento storico)
//  - "developer" -> richiesta al developer / ticket tecnico
// In entrambi i casi il testo completo resta consultabile in app; via email
// parte solo un avviso al destinatario giusto.
app.post("/requests/:clientId", requireApiKey, async (req, res) => {
  const { clientId } = req.params;
  const { category, message } = req.body || {};
  const stream = req.body?.stream === "developer" ? "developer" : "agency";
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: "Il messaggio è obbligatorio" });
  }
  try {
    const clients = await loadClients();
    if (!clients[clientId]) {
      return res.status(404).json({ error: "Cliente non trovato" });
    }
    const now = new Date().toISOString();
    const request = {
      id: String(Date.now()),
      category: category || "Richiesta",
      message: String(message).trim(),
      stream,
      status: "inviata",
      reply: null,
      createdAt: now,
      updatedAt: now,
    };
    await store.addRequest(clientId, request);

    // Avvisa il destinatario via email (best-effort): solo un avviso, il
    // contenuto vero resta in app.
    const isDev = stream === "developer";
    const label = isDev ? "richiesta al developer" : "richiesta";
    try {
      const notifyFn = isDev ? sendDeveloperEmail : sendAgencyEmail;
      await notifyFn(
        `Nuova ${label} — ${clients[clientId].displayName}`,
        `Categoria: ${request.category}\nDestinazione: ${isDev ? "Developer" : "Agenzia"}\n\n${request.message}\n\nCliente: ${clients[clientId].displayName}\nData: ${now}\n\n(Apri il portale per gestirla)`
      );
    } catch (e) {
      console.error("email error:", e.message);
    }

    // Conferma a chi invia (storico notifiche + push).
    const notif = {
      id: String(Date.now()) + "-req",
      title: isDev ? "Richiesta al developer inviata ✅" : "Richiesta ricevuta ✅",
      body: isDev
        ? "Il developer la prenderà in carico a breve."
        : "Grazie! L'agenzia ti risponderà a breve.",
      data: { type: "request", id: request.id, stream },
      sentAt: now,
    };
    await store.addNotification(clientId, notif);
    try {
      await sendExpoPush(await store.getDeviceTokens(clientId), notif.title, notif.body, notif.data);
    } catch (e) {
      console.error("push error:", e.message);
    }

    res.json({ ok: true, request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore nell'invio della richiesta" });
  }
});

// L'agenzia aggiorna una richiesta (stato / risposta). Usato dal pannello
// agenzia; se c'è una risposta, avvisa il cliente.
app.put("/requests/:clientId/:id", requireApiKey, async (req, res) => {
  const { clientId, id } = req.params;
  const { status, reply } = req.body || {};
  try {
    const patch = {};
    if (status) patch.status = status;
    if (reply !== undefined) patch.reply = reply;
    const request = await store.updateRequest(clientId, id, patch);
    if (!request) {
      return res.status(404).json({ error: "Richiesta non trovata" });
    }

    if (reply) {
      const notif = {
        id: String(Date.now()) + "-reply",
        title: "Risposta dall'agenzia 💬",
        body: reply,
        data: { type: "request", id },
        sentAt: request.updatedAt,
      };
      await store.addNotification(clientId, notif);
      try {
        await sendExpoPush(await store.getDeviceTokens(clientId), notif.title, notif.body, notif.data);
      } catch (e) {
        console.error("push error:", e.message);
      }
    }
    res.json({ ok: true, request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore nell'aggiornamento della richiesta" });
  }
});

// Creatività da approvare (Approvazioni). L'agenzia le gestisce dalla console
// Firebase (collezione "creatives"); senza Firestore si usa il seed.
app.get("/creatives/:clientId", requireApiKey, async (req, res) => {
  const { clientId } = req.params;
  try {
    const clients = await loadClients();
    if (!clients[clientId]) {
      return res.status(404).json({ error: "Cliente non trovato" });
    }
    res.json({ creatives: await store.listCreatives(clientId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore nel recupero delle creatività" });
  }
});

// Il cliente approva/rifiuta una creatività.
app.put("/creatives/:clientId/:id", requireApiKey, async (req, res) => {
  const { clientId, id } = req.params;
  const { stato } = req.body || {};
  if (!["in_attesa", "approvata", "rifiutata"].includes(stato)) {
    return res.status(400).json({ error: "stato non valido" });
  }
  try {
    const updated = await store.updateCreative(clientId, id, { stato });
    res.json({ ok: true, creative: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore nell'aggiornamento della creatività" });
  }
});

// Contenuti programmati (Calendario).
app.get("/calendar/:clientId", requireApiKey, async (req, res) => {
  const { clientId } = req.params;
  try {
    const clients = await loadClients();
    if (!clients[clientId]) {
      return res.status(404).json({ error: "Cliente non trovato" });
    }
    res.json({ calendar: await store.listCalendar(clientId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore nel recupero del calendario" });
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

  // Controllo alert periodico (best-effort): valuta gli alert di tutti i clienti
  // ogni 12 ore mentre il server è attivo. Su hosting che va in sleep (es. free
  // tier), affiancare un cron ESTERNO che chiama POST /alerts/:clientId/run.
  const ALERT_CHECK_HOURS = 12;
  setInterval(async () => {
    try {
      const clients = await loadClients();
      for (const id of Object.keys(clients)) {
        try {
          await evaluateAlerts(id);
        } catch (e) {
          console.error(`alert check ${id}:`, e.message);
        }
      }
    } catch (e) {
      console.error("alert check:", e.message);
    }
  }, ALERT_CHECK_HOURS * 3600 * 1000);
}

export { app };
