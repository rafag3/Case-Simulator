export function money(n: number): string {
  if (n >= 1000) return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n.toFixed(2).replace('.', ',');
}

export function pct(prob: number): string {
  const v = prob * 100;
  return `${v.toFixed(v < 1 ? 3 : 2).replace('.', ',')}%`;
}

export function countdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}
