function inferFractionDigits(amount: number): number {
  if (!Number.isFinite(amount)) return 0;

  const rounded = Math.round(amount * 1e6) / 1e6;
  const str = rounded.toString();
  const dotIndex = str.indexOf(".");

  if (dotIndex === -1) return 0;

  const decimals = str.slice(dotIndex + 1).replace(/0+$/, "");
  return decimals.length;
}

export function formatCurrency(amount: number): string {
  const fractionDigits = inferFractionDigits(amount);

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-AR').format(date);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}