#!/usr/bin/env node
// Aggiunge un nuovo cliente a src/clients.json e stampa i passi rimanenti.
// Uso:
//   node scripts/add-client.mjs <slug> "<Nome cliente>" <adAccountId>
// Esempio:
//   node scripts/add-client.mjs pizzeria-bella "Pizzeria Bella" 123456789012345

import { readFile, writeFile } from "fs/promises";

const [slug, displayName, adAccountRaw] = process.argv.slice(2);

if (!slug || !displayName || !adAccountRaw) {
  console.error('Uso: node scripts/add-client.mjs <slug> "<Nome cliente>" <adAccountId>');
  console.error('Es:  node scripts/add-client.mjs pizzeria-bella "Pizzeria Bella" 123456789012345');
  process.exit(1);
}

// slug: solo minuscole, numeri e trattini
if (!/^[a-z0-9-]+$/.test(slug)) {
  console.error(`Slug non valido: "${slug}". Usa solo minuscole, numeri e trattini (es. "pizzeria-bella").`);
  process.exit(1);
}

// L'ID account va numerico, senza il prefisso "act_"
const metaAdAccountId = String(adAccountRaw).replace(/^act_/, "");
if (!/^\d+$/.test(metaAdAccountId)) {
  console.error(`Ad Account ID non valido: "${adAccountRaw}". Deve essere numerico (senza "act_").`);
  process.exit(1);
}

const envVar = "META_TOKEN_" + slug.toUpperCase().replace(/-/g, "_");
const path = new URL("../src/clients.json", import.meta.url);
const clients = JSON.parse(await readFile(path, "utf-8"));

if (clients[slug]) {
  console.error(`Il cliente "${slug}" esiste già in clients.json.`);
  process.exit(1);
}

clients[slug] = { displayName, metaAdAccountId, metaAccessTokenEnvVar: envVar };
await writeFile(path, JSON.stringify(clients, null, 2) + "\n");

console.log(`✔ Aggiunto "${slug}" (${displayName}, act_${metaAdAccountId}) a src/clients.json`);
console.log(`\nPassi rimanenti:`);
console.log(`  1. Aggiungi il token nel file .env (e nei secret del deploy):`);
console.log(`       ${envVar}=EAAxxxxxxxx...`);
console.log(`  2. Nel progetto app del cliente, in app.config.js:`);
console.log(`       clientId: "${slug}"`);
