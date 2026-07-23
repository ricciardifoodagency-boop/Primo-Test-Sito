// Tipi di account del portale. Il ruolo viene scelto al primo avvio e salvato
// sul dispositivo; determina quali sezioni si vedono e dove finiscono le
// richieste (all'agenzia o al developer).

import { rolePin } from './api';
import { getItem, removeItem, setItem } from './storage';

export type Role = 'ristoratore' | 'gestore' | 'addetto' | 'developer';

// Nomi delle rotte/tab dell'app (corrispondono ai file in src/app/).
export type TabName =
  | 'index'
  | 'approvazioni'
  | 'calendario'
  | 'competitor'
  | 'notifiche'
  | 'richieste'
  | 'richieste-developer'
  | 'impostazioni';

// Metadati per la tab bar (titolo web + emoji nativo + href web).
export const TAB_META: Record<TabName, { title: string; emoji: string; href: string }> = {
  index: { title: 'Dashboard', emoji: '📊', href: '/' },
  approvazioni: { title: 'Approvazioni', emoji: '✅', href: '/approvazioni' },
  calendario: { title: 'Calendario', emoji: '🗓️', href: '/calendario' },
  competitor: { title: 'Competitor', emoji: '🕵️', href: '/competitor' },
  notifiche: { title: 'Notifiche', emoji: '🔔', href: '/notifiche' },
  richieste: { title: 'Richieste', emoji: '💬', href: '/richieste' },
  'richieste-developer': { title: 'Richieste dev', emoji: '🛠️', href: '/richieste-developer' },
  impostazioni: { title: 'Impostazioni', emoji: '⚙️', href: '/impostazioni' },
};

// Tutte le rotte-tab esistenti (per dichiararle e nascondere quelle non
// pertinenti al ruolo).
export const ALL_TAB_NAMES: TabName[] = [
  'index',
  'approvazioni',
  'calendario',
  'competitor',
  'notifiche',
  'richieste',
  'richieste-developer',
  'impostazioni',
];

export type RequestStream = 'agency' | 'developer';

export type RoleConfig = {
  role: Role;
  label: string;
  emoji: string;
  description: string;
  // Richiede il PIN per essere selezionato (ruoli "interni").
  internal: boolean;
  // Sezioni visibili nella tab bar, nell'ordine desiderato.
  tabs: TabName[];
  // Destinazione della sezione "Richieste" di questo ruolo.
  requestStream: RequestStream;
  // Mostra il bottone "Invia ticket" (ticket = richiesta al developer).
  hasTicketButton: boolean;
  // È la casella di arrivo delle richieste al developer.
  hasDeveloperInbox: boolean;
};

const ALL_TABS: TabName[] = [
  'index',
  'approvazioni',
  'calendario',
  'competitor',
  'notifiche',
  'richieste',
];

export const ROLES: Record<Role, RoleConfig> = {
  ristoratore: {
    role: 'ristoratore',
    label: 'Ristoratore / Negoziante',
    emoji: '🍽️',
    description: 'Tutte le sezioni. Le richieste vanno all’agenzia; in più il bottone “Invia ticket” al developer.',
    internal: false,
    tabs: ALL_TABS,
    requestStream: 'agency',
    hasTicketButton: true,
    hasDeveloperInbox: false,
  },
  gestore: {
    role: 'gestore',
    label: 'Gestore',
    emoji: '🧭',
    description: 'Tutte le sezioni. Le sue richieste vanno al developer.',
    internal: true,
    tabs: ALL_TABS,
    requestStream: 'developer',
    hasTicketButton: false,
    hasDeveloperInbox: false,
  },
  addetto: {
    role: 'addetto',
    label: 'Addetto consegna contenuti',
    emoji: '📦',
    description: 'Approvazioni, Calendario, Notifiche e Richieste (al developer).',
    internal: true,
    tabs: ['approvazioni', 'calendario', 'notifiche', 'richieste'],
    requestStream: 'developer',
    hasTicketButton: false,
    hasDeveloperInbox: false,
  },
  developer: {
    role: 'developer',
    label: 'Developer',
    emoji: '🛠️',
    description: 'Tutte le sezioni più l’inbox “Richieste al developer”.',
    internal: true,
    tabs: [...ALL_TABS, 'richieste-developer'],
    requestStream: 'agency',
    hasTicketButton: false,
    hasDeveloperInbox: true,
  },
};

export const ROLE_ORDER: Role[] = ['ristoratore', 'gestore', 'addetto', 'developer'];

// Tab visibili per un ruolo: le sue sezioni + "Impostazioni" (sempre, per ora).
// Con ruolo nullo (scelta in corso) restituiamo un set di default che INCLUDE
// la home, così il web non naviga via da '/' mentre è aperta la scelta ruolo.
export function visibleTabs(role: Role | null): TabName[] {
  if (!role) {
    return ['index', 'approvazioni', 'calendario', 'competitor', 'notifiche', 'richieste', 'impostazioni'];
  }
  return [...ROLES[role].tabs, 'impostazioni'];
}

export function isRole(v: unknown): v is Role {
  return typeof v === 'string' && v in ROLES;
}

// Verifica il PIN per i ruoli interni.
export function checkPin(input: string): boolean {
  return input.trim() === String(rolePin);
}

const STORAGE_KEY = 'portal.role';

export async function loadRole(): Promise<Role | null> {
  const v = await getItem(STORAGE_KEY);
  return isRole(v) ? v : null;
}

export async function saveRole(role: Role): Promise<void> {
  await setItem(STORAGE_KEY, role);
}

export async function clearRole(): Promise<void> {
  await removeItem(STORAGE_KEY);
}
