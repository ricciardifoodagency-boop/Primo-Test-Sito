// Layer dati del portale. Se è configurato Firebase (variabile
// FIREBASE_SERVICE_ACCOUNT con la chiave di servizio) usa Firestore e i dati
// PERSISTONO. Altrimenti ripiega su store in memoria + file "seed", così i test
// e lo sviluppo locale funzionano anche senza credenziali.

import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFile } from "fs/promises";

let fsdb = null;

export function initFirestore() {
  // Due modi di fornire la chiave:
  //  - FIREBASE_SERVICE_ACCOUNT = JSON della chiave (stringa)
  //  - GOOGLE_APPLICATION_CREDENTIALS = percorso a un file JSON (es. Secret File su Render)
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!raw && !credPath) return null;
  try {
    if (!getApps().length) {
      initializeApp({
        credential: raw ? cert(JSON.parse(raw)) : applicationDefault(),
      });
    }
    fsdb = getFirestore();
    try {
      // preferRest: usa l'API REST invece di gRPC (più compatibile dietro proxy).
      fsdb.settings({ ignoreUndefinedProperties: true, preferRest: true });
    } catch {
      /* già configurato */
    }
    return fsdb;
  } catch (e) {
    console.error("Firestore init error:", e.message);
    return null;
  }
}

export function usingFirestore() {
  return !!fsdb;
}

function col(clientId, name) {
  return fsdb.collection("clients").doc(clientId).collection(name);
}

// --- fallback in memoria + seed -------------------------------------------------
const mem = {
  devices: new Map(),
  notifications: new Map(),
  requests: new Map(),
  alertConfig: new Map(),
};

async function loadSeed(file) {
  try {
    return JSON.parse(await readFile(new URL(`./${file}`, import.meta.url), "utf-8"));
  } catch {
    return {};
  }
}

// --- Dispositivi (push token) --------------------------------------------------
export async function addDevice(clientId, token) {
  if (fsdb) {
    await col(clientId, "devices")
      .doc(Buffer.from(token).toString("base64url"))
      .set({ token, updatedAt: new Date().toISOString() });
    const snap = await col(clientId, "devices").get();
    return snap.size;
  }
  if (!mem.devices.has(clientId)) mem.devices.set(clientId, new Set());
  mem.devices.get(clientId).add(token);
  return mem.devices.get(clientId).size;
}

export async function getDeviceTokens(clientId) {
  if (fsdb) {
    const snap = await col(clientId, "devices").get();
    return snap.docs.map((d) => d.data().token);
  }
  return [...(mem.devices.get(clientId) || [])];
}

// --- Notifiche -----------------------------------------------------------------
export async function addNotification(clientId, notif) {
  if (fsdb) {
    await col(clientId, "notifications").doc(notif.id).set(notif);
    return;
  }
  const arr = mem.notifications.get(clientId) || [];
  arr.unshift(notif);
  mem.notifications.set(clientId, arr);
}

export async function listNotifications(clientId) {
  if (fsdb) {
    const snap = await col(clientId, "notifications")
      .orderBy("sentAt", "desc")
      .limit(100)
      .get();
    return snap.docs.map((d) => d.data());
  }
  const seed = await loadSeed("notifications-seed.json");
  return [...(mem.notifications.get(clientId) || []), ...(seed[clientId] || [])];
}

// --- Richieste -----------------------------------------------------------------
export async function addRequest(clientId, request) {
  if (fsdb) {
    await col(clientId, "requests").doc(request.id).set(request);
    return;
  }
  const arr = mem.requests.get(clientId) || [];
  arr.unshift(request);
  mem.requests.set(clientId, arr);
}

export async function listRequests(clientId) {
  if (fsdb) {
    const snap = await col(clientId, "requests")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();
    return snap.docs.map((d) => d.data());
  }
  const seed = await loadSeed("requests-seed.json");
  return [...(mem.requests.get(clientId) || []), ...(seed[clientId] || [])];
}

export async function updateRequest(clientId, id, patch) {
  if (fsdb) {
    const ref = col(clientId, "requests").doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const updated = { ...doc.data(), ...patch, updatedAt: new Date().toISOString() };
    await ref.set(updated);
    return updated;
  }
  const arr = mem.requests.get(clientId) || [];
  const req = arr.find((r) => r.id === id);
  if (!req) return null;
  Object.assign(req, patch, { updatedAt: new Date().toISOString() });
  return req;
}

// --- Config alert --------------------------------------------------------------
export async function getStoredAlertConfig(clientId) {
  if (fsdb) {
    const doc = await fsdb.collection("clients").doc(clientId).get();
    return doc.exists ? doc.data()?.alertConfig || null : null;
  }
  return mem.alertConfig.get(clientId) || null;
}

export async function setStoredAlertConfig(clientId, config) {
  if (fsdb) {
    await fsdb.collection("clients").doc(clientId).set({ alertConfig: config }, { merge: true });
    return;
  }
  mem.alertConfig.set(clientId, config);
}

// --- Creatività (Approvazioni) e Calendario ------------------------------------
// L'agenzia le inserisce dalla console Firebase (collezioni "creatives" e
// "calendar"). Senza Firestore si usano i file seed.
const creativeOverlay = new Map(); // `${clientId}:${id}` -> patch (solo fallback)

export async function listCreatives(clientId) {
  if (fsdb) {
    const snap = await col(clientId, "creatives").get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  const seed = await loadSeed("creatives-seed.json");
  return (seed[clientId] || []).map((c) => ({
    ...c,
    ...(creativeOverlay.get(`${clientId}:${c.id}`) || {}),
  }));
}

// Aggiorna una creatività (es. stato approvata/rifiutata dal cliente).
export async function updateCreative(clientId, id, patch) {
  if (fsdb) {
    const ref = col(clientId, "creatives").doc(id);
    await ref.set(patch, { merge: true });
    const doc = await ref.get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }
  const key = `${clientId}:${id}`;
  creativeOverlay.set(key, { ...(creativeOverlay.get(key) || {}), ...patch });
  return { id, ...patch };
}

export async function listCalendar(clientId) {
  if (fsdb) {
    const snap = await col(clientId, "calendar").get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.id.localeCompare(b.id));
  }
  const seed = await loadSeed("calendar-seed.json");
  return seed[clientId] || [];
}
