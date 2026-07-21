// Richieste in-app: il cliente invia richieste all'agenzia e ne consulta lo
// storico con stato e risposta.

import { apiKey, backendUrl, clientId } from './api';

export type RequestStatus = 'inviata' | 'in_carico' | 'completata';

export type ClientRequest = {
  id: string;
  category: string;
  message: string;
  status: RequestStatus;
  reply: string | null;
  createdAt: string;
  updatedAt: string;
};

export const CATEGORIES = [
  'Promozione da lanciare',
  'Modifica contenuti',
  'Domanda sui risultati',
  'Altro',
];

export async function fetchRequests(): Promise<ClientRequest[]> {
  const res = await fetch(`${backendUrl}/requests/${clientId}`, {
    headers: { 'x-api-key': apiKey },
  });
  if (!res.ok) throw new Error(`Errore recupero richieste: ${res.status}`);
  const json = (await res.json()) as { requests: ClientRequest[] };
  return json.requests;
}

export async function sendRequest(category: string, message: string): Promise<ClientRequest> {
  const res = await fetch(`${backendUrl}/requests/${clientId}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ category, message }),
  });
  if (!res.ok) throw new Error(`Errore invio richiesta: ${res.status}`);
  const json = (await res.json()) as { request: ClientRequest };
  return json.request;
}
