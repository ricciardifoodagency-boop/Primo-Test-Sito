// Popola Firestore coi dati iniziali (creatività, calendario, notifiche) presi
// dai file seed. Uso una-tantum: node scripts/seed-firestore.mjs
// Richiede FIREBASE_SERVICE_ACCOUNT in ambiente.

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFile } from "fs/promises";

const creds = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
if (!getApps().length) initializeApp({ credential: cert(creds) });
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true, preferRest: true });

const clientId = process.argv[2] || "ricciardi-food-agency";

async function seedCollection(name, file) {
  const seed = JSON.parse(await readFile(new URL(`../src/${file}`, import.meta.url), "utf-8"));
  const items = seed[clientId] || [];
  for (const it of items) {
    await db.collection("clients").doc(clientId).collection(name).doc(it.id).set(it);
  }
  console.log(`seeded ${name}: ${items.length}`);
}

await seedCollection("creatives", "creatives-seed.json");
await seedCollection("calendar", "calendar-seed.json");
await seedCollection("notifications", "notifications-seed.json");

// Pulisce eventuali richieste di prova create durante i test.
const reqs = await db.collection("clients").doc(clientId).collection("requests").get();
let removed = 0;
for (const d of reqs.docs) {
  const c = d.data().category;
  if (c === "Verifica DB" || c === "Test Firestore") {
    await d.ref.delete();
    removed++;
  }
}
console.log(`cleanup richieste di test: ${removed}`);

// Pulisce notifiche residue non-seed (es. conferme generate durante i test).
const seedNotif = JSON.parse(
  await readFile(new URL("../src/notifications-seed.json", import.meta.url), "utf-8")
);
const keepIds = new Set((seedNotif[clientId] || []).map((n) => n.id));
const notifs = await db.collection("clients").doc(clientId).collection("notifications").get();
let removedN = 0;
for (const d of notifs.docs) {
  if (!keepIds.has(d.id)) {
    await d.ref.delete();
    removedN++;
  }
}
console.log(`cleanup notifiche di test: ${removedN}`);
process.exit(0);
