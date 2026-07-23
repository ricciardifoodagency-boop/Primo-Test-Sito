// Richieste in-app. Esistono due flussi (stream):
//  - "agency"    -> richieste all'agenzia
//  - "developer" -> richieste al developer / ticket tecnici
// Ogni utente consulta lo storico del proprio flusso; il Developer ha l'inbox
// di tutte le richieste "developer".

import { apiKey, backendUrl, clientId } from './api';
import type { RequestStream } from './role';

export type RequestStatus = 'inviata' | 'in_carico' | 'completata';

export type ClientRequest = {
  id: string;
  category: string;
  message: string;
  stream?: RequestStream;
  status: RequestStatus;
  reply: string | null;
  createdAt: string;
  updatedAt: string;
};

// Categorie in base alla destinazione.
export const AGENCY_CATEGORIES = [
  'Promozione da lanciare',
  'Modifica contenuti',
  'Domanda sui risultati',
  'Altro',
];
export const DEVELOPER_CATEGORIES = [
  'Problema tecnico',
  'Bug nell’app',
  'Richiesta funzionalità',
  'Altro',
];

export function categoriesFor(stream: RequestStream): string[] {
  return stream === 'developer' ? DEVELOPER_CATEGORIES : AGENCY_CATEGORIES;
}

export async function fetchRequests(stream?: RequestStream): Promise<ClientRequest[]> {
  const qs = stream ? `?stream=${stream}` : '';
  const res = await fetch(`${backendUrl}/requests/${clientId}${qs}`, {
    headers: { 'x-api-key': apiKey },
  });
  if (!res.ok) throw new Error(`Errore recupero richieste: ${res.status}`);
  const json = (await res.json()) as { requests: ClientRequest[] };
  return json.requests;
}

export async function sendRequest(
  category: string,
  message: string,
  stream: RequestStream = 'agency'
): Promise<ClientRequest> {
  const res = await fetch(`${backendUrl}/requests/${clientId}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ category, message, stream }),
  });
  if (!res.ok) throw new Error(`Errore invio richiesta: ${res.status}`);
  const json = (await res.json()) as { request: ClientRequest };
  return json.request;
}

// Aggiorna stato/risposta di una richiesta (usato dall'inbox Developer).
export async function updateRequest(
  id: string,
  patch: { status?: RequestStatus; reply?: string }
): Promise<ClientRequest> {
  const res = await fetch(`${backendUrl}/requests/${clientId}/${id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Errore aggiornamento richiesta: ${res.status}`);
  const json = (await res.json()) as { request: ClientRequest };
  return json.request;
}
