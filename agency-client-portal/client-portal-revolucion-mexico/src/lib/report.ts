// Genera un report PDF brandizzato dei KPI e apre il pannello di condivisione,
// così il cliente può salvarlo o inviarlo. Il PDF è creato sul telefono a
// partire da un HTML (expo-print), quindi il backend resta leggero.

import * as Print from 'expo-print';
import { isAvailableAsync, shareAsync } from 'expo-sharing';

import type { Kpi } from './api';
import { formatEuro, formatInt, formatPct } from './format';

function summaryText(kpi: Kpi): string {
  const cpa = kpi.costPerResult != null ? formatEuro(kpi.costPerResult) : '—';
  const label = (kpi.resultLabel || 'risultati').toLowerCase();
  return (
    `Nel periodo "${kpi.periodo}" sono stati investiti ${formatEuro(kpi.spend)} in campagne Meta, ` +
    `ottenendo ${formatInt(kpi.results)} ${label} a un costo medio di ${cpa} ciascuno. ` +
    `Le inserzioni sono state mostrate ${formatInt(kpi.impressions)} volte, raggiungendo ` +
    `${formatInt(kpi.reach)} persone.`
  );
}

export function buildReportHtml(kpi: Kpi, brandColor: string): string {
  const cpa = kpi.costPerResult != null ? formatEuro(kpi.costPerResult) : '—';
  const generato = new Date().toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const card = (label: string, value: string) => `
    <div class="card">
      <div class="label">${label}</div>
      <div class="value">${value}</div>
    </div>`;

  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1a1718; margin: 0; padding: 40px; }
  .head { display: flex; align-items: center; gap: 12px; border-bottom: 3px solid ${brandColor}; padding-bottom: 16px; }
  .dot { width: 18px; height: 18px; border-radius: 50%; background: ${brandColor}; }
  h1 { font-size: 22px; margin: 0; }
  .sub { color: #6d6360; font-size: 13px; margin-top: 4px; }
  .grid { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 26px; }
  .card { flex: 1 1 40%; background: #f6f4f3; border-radius: 12px; padding: 18px 20px; }
  .label { text-transform: uppercase; letter-spacing: .06em; font-size: 11px; color: #6d6360; font-weight: 700; }
  .value { font-size: 26px; font-weight: 700; margin-top: 6px; }
  .summary { margin-top: 28px; background: ${brandColor}10; border-left: 4px solid ${brandColor}; padding: 16px 18px; border-radius: 8px; font-size: 14px; line-height: 1.6; }
  .summary h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .06em; color: ${brandColor}; margin: 0 0 8px; }
  .foot { margin-top: 40px; border-top: 1px solid #e7dfdd; padding-top: 14px; color: #9a908c; font-size: 11px; display: flex; justify-content: space-between; }
</style>
</head>
<body>
  <div class="head">
    <div class="dot"></div>
    <div>
      <h1>${kpi.displayName}</h1>
      <div class="sub">Report Meta Ads · ${kpi.periodo}</div>
    </div>
  </div>

  <div class="grid">
    ${card('Spesa', formatEuro(kpi.spend))}
    ${card(kpi.resultLabel || 'Risultati', formatInt(kpi.results))}
    ${card('Costo per risultato', cpa)}
    ${card('Impression', formatInt(kpi.impressions))}
    ${card('Copertura', formatInt(kpi.reach))}
    ${card('CTR', formatPct(kpi.ctr))}
  </div>

  <div class="summary">
    <h2>In parole semplici</h2>
    ${summaryText(kpi)}
  </div>

  <div class="foot">
    <span>Report generato il ${generato}</span>
    <span>Portale Clienti · Stefano Ricciardi Food Agency</span>
  </div>
</body>
</html>`;
}

export async function downloadReport(kpi: Kpi, brandColor: string): Promise<void> {
  const html = buildReportHtml(kpi, brandColor);
  const { uri } = await Print.printToFileAsync({ html });
  if (await isAvailableAsync()) {
    await shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Report KPI',
    });
  }
}
