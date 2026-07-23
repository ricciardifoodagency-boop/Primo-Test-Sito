// Storage chiave-valore semplice. Questa è la versione di DEFAULT (nativo):
// per ora in memoria. TODO prima dell'APK definitivo: sostituire con
// @react-native-async-storage/async-storage per far persistere il ruolo tra i
// riavvii. Su web viene usato storage.web.ts (localStorage, persistente).

const mem = new Map<string, string>();

export async function getItem(key: string): Promise<string | null> {
  return mem.has(key) ? (mem.get(key) as string) : null;
}

export async function setItem(key: string, value: string): Promise<void> {
  mem.set(key, value);
}

export async function removeItem(key: string): Promise<void> {
  mem.delete(key);
}
