// Formattatori numerici in stile italiano, condivisi tra dashboard e report.

export function formatInt(n: number): string {
  return Math.round(n || 0).toLocaleString('it-IT');
}

export function formatEuro(n: number): string {
  return (
    '€ ' +
    (n || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

export function formatPct(n: number): string {
  return (
    (n || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'
  );
}

export function formatUpdatedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
