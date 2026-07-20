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

export async function fetchMetaInsights(adAccountId, accessToken) {
  // Endpoint Meta Marketing API: insights aggregati ultimi 30 giorni.
  // Documentazione: https://developers.facebook.com/docs/marketing-api/insights
  const fields = "spend,actions,impressions,cpm";
  const url = `https://graph.facebook.com/v20.0/act_${adAccountId}/insights?fields=${fields}&date_preset=last_30d&access_token=${accessToken}`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meta API error ${res.status}: ${body}`);
  }
  const json = await res.json();
  return json.data?.[0] || null;
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

export function extractResults(actions) {
  if (!Array.isArray(actions)) return 0;
  for (const type of RESULT_ACTION_TYPES) {
    const match = actions.find((a) => a.action_type === type);
    if (match) return Number(match.value) || 0;
  }
  return 0;
}

// Trasforma la risposta grezza di Meta nel payload compatto che l'app mobile consuma.
export function buildKpiPayload(clientId, client, insights) {
  const spend = insights ? Number(insights.spend) : 0;
  const results = extractResults(insights?.actions);
  return {
    clientId,
    displayName: client.displayName,
    spend,
    impressions: insights ? Number(insights.impressions) : 0,
    results,
    // Costo per risultato (CPA): speso / risultati. null quando non ci sono
    // risultati, per evitare divisioni per zero e mostrare "—" nell'app.
    costPerResult: results > 0 ? spend / results : null,
    periodo: "ultimi 30 giorni",
    aggiornatoIl: new Date().toISOString(),
  };
}

app.get("/kpi/:clientId", requireApiKey, async (req, res) => {
  const { clientId } = req.params;

  try {
    const clients = await loadClients();
    const client = clients[clientId];
    if (!client) {
      return res.status(404).json({ error: "Cliente non trovato" });
    }

    const cached = cache.get(clientId);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return res.json(cached.data);
    }

    const accessToken = process.env[client.metaAccessTokenEnvVar];
    if (!accessToken) {
      return res.status(500).json({
        error: `Token mancante in ambiente per la variabile ${client.metaAccessTokenEnvVar}`,
      });
    }

    const insights = await fetchMetaInsights(client.metaAdAccountId, accessToken);
    const payload = buildKpiPayload(clientId, client, insights);

    cache.set(clientId, { data: payload, fetchedAt: Date.now() });
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore nel recupero dei dati" });
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
