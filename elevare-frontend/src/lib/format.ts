export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

export const thb = (n: number) => '฿' + Math.round(n).toLocaleString('en-US');

/* "15 Nov 2026, 21:39", or "—" when missing */
export const when = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/* "14,900,000" → "14900000" */
export const digits = (s: string) => s.replace(/[^\d]/g, '');
