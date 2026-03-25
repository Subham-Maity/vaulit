export function sanitizeString(value: string | undefined | null): string {
  if (typeof value !== 'string') {
    return '';
  }
  // Strip control characters
  return value.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
}
