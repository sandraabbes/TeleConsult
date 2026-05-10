/**
 * Format a Date to ISO string (YYYY-MM-DDTHH:mm:ss.sssZ).
 */
export function formatDateISO(date: Date): string {
  return date.toISOString();
}

/**
 * Format a Date to a human-readable string (e.g. for display).
 */
export function formatDateDisplay(date: Date, locale = 'en-US'): string {
  return date.toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/**
 * Get current timestamp in seconds (Unix).
 */
export function getUnixTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}
