// Integrazione Google Drive per la sezione Approvazioni.
// Riusa il service account di Firebase (FIREBASE_SERVICE_ACCOUNT) aggiungendo lo
// scope Drive. Per attivarlo servono:
//   - API Google Drive abilitata nel progetto Google Cloud
//   - la cartella madre condivisa (Editor) con l'email del service account
//   - la variabile DRIVE_FOLDER_ID = ID della cartella madre
// Modalità demo/test: DRIVE_MOCK=1 usa una struttura finta in memoria.

import { GoogleAuth } from "google-auth-library";

const FOLDER_ID = process.env.DRIVE_FOLDER_ID || "";
const MOCK = process.env.DRIVE_MOCK === "1";

export function driveConfigured() {
  return MOCK || (!!FOLDER_ID && !!process.env.FIREBASE_SERVICE_ACCOUNT);
}

export function driveFolderUrl() {
  if (MOCK) return "https://drive.google.com/drive/folders/DEMO";
  return FOLDER_ID ? `https://drive.google.com/drive/folders/${FOLDER_ID}` : null;
}

// --- Autenticazione (token OAuth per lo scope Drive) --------------------------
let authClient = null;
async function token() {
  if (!authClient) {
    const creds = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    const auth = new GoogleAuth({
      credentials: creds,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    authClient = await auth.getClient();
  }
  const t = await authClient.getAccessToken();
  return t.token;
}

async function driveApi(path, params = {}, init = {}) {
  const url = new URL(`https://www.googleapis.com/drive/v3/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    ...init,
    headers: { authorization: `Bearer ${await token()}`, ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`Drive ${res.status}: ${await res.text()}`);
  return res.status === 204 ? {} : res.json();
}

// --- MOCK ---------------------------------------------------------------------
const mockFiles = [
  { id: "m1", name: "Reel_piatto_settimana.mp4", gruppo: "Settembre", createdTime: "2026-07-20T09:00:00Z" },
  { id: "m2", name: "Carosello_menu_estivo.mp4", gruppo: "Settembre", createdTime: "2026-07-21T09:00:00Z" },
  { id: "m3", name: "Storia_aperitivo.mp4", gruppo: "Ottobre", createdTime: "2026-07-22T09:00:00Z" },
];
const mockTrashed = new Set();

// --- API pubblica -------------------------------------------------------------

// Elenca i video divisi per sottocartella (gruppo). Ogni voce è un "creative".
export async function listDriveCreatives() {
  if (MOCK) {
    return mockFiles
      .filter((f) => !mockTrashed.has(f.id))
      .map((f) => ({
        id: f.id,
        titolo: f.name,
        gruppo: f.gruppo,
        formato: "Video",
        pianificata: f.createdTime,
        mediaUrl: `https://drive.google.com/file/d/${f.id}/view`,
      }));
  }

  // Sottocartelle della cartella madre = gruppi.
  const folders = await driveApi("files", {
    q: `'${FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id,name)",
    orderBy: "name",
    pageSize: "100",
  });

  const groups = folders.files?.length
    ? folders.files
    : [{ id: FOLDER_ID, name: "Video" }]; // nessuna sottocartella: usa la cartella madre

  const out = [];
  for (const folder of groups) {
    const vids = await driveApi("files", {
      q: `'${folder.id}' in parents and mimeType contains 'video/' and trashed=false`,
      fields: "files(id,name,mimeType,createdTime,webViewLink,thumbnailLink)",
      orderBy: "createdTime desc",
      pageSize: "100",
    });
    for (const f of vids.files || []) {
      out.push({
        id: f.id,
        titolo: f.name,
        gruppo: folder.name,
        formato: (f.mimeType || "video").replace("video/", "").toUpperCase(),
        pianificata: f.createdTime,
        mediaUrl: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
        thumbnail: f.thumbnailLink || null,
      });
    }
  }
  return out;
}

// Sposta il file nel cestino di Drive (rifiuto). Reversibile ~30 giorni.
export async function trashDriveFile(fileId) {
  if (MOCK) {
    mockTrashed.add(fileId);
    return { trashed: true };
  }
  await driveApi(
    `files/${fileId}`,
    { supportsAllDrives: "true" },
    { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ trashed: true }) }
  );
  return { trashed: true };
}
