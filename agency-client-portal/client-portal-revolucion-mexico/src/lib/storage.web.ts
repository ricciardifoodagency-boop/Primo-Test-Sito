// Storage chiave-valore su web: usa localStorage (persistente nel browser).

export async function getItem(key: string): Promise<string | null> {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage non disponibile (es. modalità privata): ignora */
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignora */
  }
}
