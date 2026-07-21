import test from "node:test";
import assert from "node:assert/strict";
import { app, buildKpiPayload, extractResults, resolveRange } from "../src/server.js";

// --- Unit test: estrazione risultati (conversioni) da Meta ---------------------

test("extractResults sceglie la conversione con priorità più alta", () => {
  // purchase vince su link_click
  assert.equal(
    extractResults([
      { action_type: "link_click", value: "120" },
      { action_type: "purchase", value: "7" },
    ]),
    7
  );
  // account a lead: niente purchase, prende i lead
  assert.equal(
    extractResults([
      { action_type: "landing_page_view", value: "300" },
      { action_type: "lead", value: "42" },
    ]),
    42
  );
  // nessuna azione riconosciuta -> 0
  assert.equal(extractResults(undefined), 0);
  assert.equal(extractResults([{ action_type: "post_reaction", value: "9" }]), 0);
});

test("extractResults con tipo configurato usa SOLO quello (coerenza tra periodi)", () => {
  const actions = [
    { action_type: "link_click", value: "163" },
    { action_type: "lead", value: "7" },
  ];
  // con preferredType "lead" prende i lead, ignorando link_click (più numerosi)
  assert.equal(extractResults(actions, "lead"), 7);
  // se il tipo configurato non è presente nel periodo -> 0 (niente ripiego)
  assert.equal(extractResults([{ action_type: "link_click", value: "163" }], "lead"), 0);
});

// --- Unit test: trasformazione della risposta Meta nel payload KPI -------------

test("buildKpiPayload trasforma l'insight Meta nel payload per l'app", () => {
  // Fixture con la stessa forma della risposta reale della Marketing API,
  // numeri allineati ai dati reali di Stefano Ricciardi Food Agency (ultimi 30gg).
  const insights = {
    spend: "2095.31",
    impressions: "155185",
    cpm: "13.50",
    reach: "65361",
    clicks: "1462",
    ctr: "0.94",
    actions: [
      { action_type: "landing_page_view", value: "4100" },
      { action_type: "lead", value: "48" },
    ],
  };

  const payload = buildKpiPayload(
    "ricciardi-food-agency",
    { displayName: "Stefano Ricciardi Food Agency" },
    insights,
    "ultimi 7 giorni"
  );

  assert.equal(payload.clientId, "ricciardi-food-agency");
  assert.equal(payload.displayName, "Stefano Ricciardi Food Agency");
  assert.equal(payload.spend, 2095.31);
  assert.equal(payload.impressions, 155185);
  assert.equal(payload.results, 48);
  // Costo per risultato = 2095.31 / 48 ≈ 43.65
  assert.equal(Math.round(payload.costPerResult * 100) / 100, 43.65);
  assert.equal(payload.reach, 65361);
  assert.equal(payload.clicks, 1462);
  assert.equal(payload.cpm, 13.5);
  assert.equal(payload.ctr, 0.94);
  // il periodo passato come argomento viene riflesso nel payload
  assert.equal(payload.periodo, "ultimi 7 giorni");
  assert.ok(typeof payload.aggiornatoIl === "string");
});

test("resolveRange accetta i periodi validi e ripiega sul default", () => {
  assert.equal(resolveRange("7d"), "7d");
  assert.equal(resolveRange("30d"), "30d");
  assert.equal(resolveRange("90d"), "90d");
  assert.equal(resolveRange("month"), "month");
  // valori non validi o assenti -> default 30d
  assert.equal(resolveRange("qualsiasi"), "30d");
  assert.equal(resolveRange(undefined), "30d");
});

test("buildKpiPayload: costPerResult è null quando non ci sono risultati", () => {
  const insights = { spend: "100", impressions: "5000", actions: [] };
  const payload = buildKpiPayload("x", { displayName: "X" }, insights);
  assert.equal(payload.results, 0);
  assert.equal(payload.costPerResult, null);
});

// --- Integration test HTTP: health, auth, 404, token mancante ------------------

test("endpoint HTTP end-to-end", async (t) => {
  const KEY = process.env.PORTAL_API_KEY;
  assert.ok(KEY, "PORTAL_API_KEY deve essere impostata (via .env) per i test HTTP");

  const server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(() => server.close());

  // /health è pubblico
  const health = await fetch(`${base}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: "ok" });

  // senza chiave -> 401
  const noAuth = await fetch(`${base}/kpi/ricciardi-food-agency`);
  assert.equal(noAuth.status, 401);

  // chiave sbagliata -> 401
  const badAuth = await fetch(`${base}/kpi/ricciardi-food-agency`, {
    headers: { "x-api-key": "chiave-sbagliata" },
  });
  assert.equal(badAuth.status, 401);

  // cliente inesistente -> 404
  const notFound = await fetch(`${base}/kpi/cliente-inesistente`, {
    headers: { "x-api-key": KEY },
  });
  assert.equal(notFound.status, 404);

  // cliente reale ma senza token Meta in ambiente -> 500 con messaggio chiaro.
  // Togliamo temporaneamente il token per esercitare il ramo in modo
  // deterministico, senza dipendere dalla rete verso Meta.
  const savedToken = process.env.META_TOKEN_RICCIARDI_FOOD_AGENCY;
  delete process.env.META_TOKEN_RICCIARDI_FOOD_AGENCY;
  const noToken = await fetch(`${base}/kpi/ricciardi-food-agency`, {
    headers: { "x-api-key": KEY },
  });
  if (savedToken !== undefined) {
    process.env.META_TOKEN_RICCIARDI_FOOD_AGENCY = savedToken;
  }
  assert.equal(noToken.status, 500);
  const body = await noToken.json();
  assert.match(body.error, /Token mancante/);
});
