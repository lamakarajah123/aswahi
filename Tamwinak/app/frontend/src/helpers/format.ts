/**
 * Format a numeric price value with the ₪ currency symbol.
 * Handles string-typed numbers from API responses.
 */
export function formatPrice(amount: number | string, decimals = 2): string {
  return `₪${(Number(amount) || 0).toFixed(decimals)}`;
}

/**
 * Format an ISO date string for display.
 * Returns '—' for null/undefined inputs.
 */
export function formatDate(
  dateStr: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
  locale = 'en-US',
): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(locale, options);
}

/**
 * Format an ISO date string with time for display.
 * Returns '—' for null/undefined inputs.
 */
export function formatDateTime(
  dateStr: string | null | undefined,
  locale?: string,
): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString(locale);
}
