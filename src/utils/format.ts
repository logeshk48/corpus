// Indian grouping: 12,34,567 (not 1,234,567). Used everywhere money is shown.
export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// Short Indian form for big numbers: 1.25 L, 3.4 Cr. Readable at a glance on charts
// and headlines. Below ₹1,00,000 the full number is already short enough.
export function compactINR(amount: number): string {
  const n = Math.abs(amount);
  const sign = amount < 0 ? '−' : '';
  if (n >= 1_00_00_000) return `${sign}₹${trim(n / 1_00_00_000)} Cr`;
  if (n >= 1_00_000) return `${sign}₹${trim(n / 1_00_000)} L`;
  if (n >= 1_000) return `${sign}₹${trim(n / 1_000)}K`;
  return `${sign}₹${Math.round(n)}`;
}

// 1.25 → "1.25" · 1.0 → "1" · 12.34 → "12.3"
function trim(v: number): string {
  const digits = v >= 100 ? 0 : v >= 10 ? 1 : 2;
  return Number(v.toFixed(digits)).toLocaleString('en-IN');
}

// Big headline figures: "₹1,25,000 · 1.25 L" — exact first, short form as a hint
export function formatINRLong(amount: number): string {
  return Math.abs(amount) >= 1_00_000 ? `${formatINR(amount)} · ${compactINR(amount).replace('₹', '')}` : formatINR(amount);
}
