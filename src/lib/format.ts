export function money(value: number | string | null | undefined) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function dateOnly(value: string | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}
