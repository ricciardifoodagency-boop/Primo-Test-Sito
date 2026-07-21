// Configurazione degli alert automatici (attivazione + soglie), letta/scritta
// dal backend.

import { apiKey, backendUrl, clientId } from './api';

export type AlertDef = {
  id: string;
  label: string;
  kind: 'threshold' | 'toggle';
  unit?: string;
  default?: number;
  group: string;
  desc: string;
};

export type AlertRule = { enabled: boolean; threshold?: number };
export type AlertConfig = Record<string, AlertRule>;
export type AlertsResponse = { defs: AlertDef[]; config: AlertConfig };

export async function fetchAlerts(): Promise<AlertsResponse> {
  const res = await fetch(`${backendUrl}/alerts/${clientId}`, {
    headers: { 'x-api-key': apiKey },
  });
  if (!res.ok) throw new Error(`Errore recupero alert: ${res.status}`);
  return res.json() as Promise<AlertsResponse>;
}

export async function saveAlerts(config: AlertConfig): Promise<void> {
  const res = await fetch(`${backendUrl}/alerts/${clientId}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ config }),
  });
  if (!res.ok) throw new Error(`Errore salvataggio alert: ${res.status}`);
}
