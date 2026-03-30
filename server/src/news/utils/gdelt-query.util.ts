import { GDELT_API_BASE_URL, GDELT_MAX_RECORDS, GDELT_MODE } from '../constant';
import { GdeltQueryParams } from '../types';

/**
 * Formats a Date object into GDELT's required timestamp string.
 * Output format: YYYYMMDDHHMMSS
 *
 * @param date - JavaScript Date to format
 * @returns Formatted timestamp string
 */
export function formatGdeltDateTime(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return (
    String(date.getUTCFullYear()) +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds())
  );
}

/**
 * Parses an ISO 8601 date string and returns a GDELT-formatted timestamp.
 * Throws if the string is not a valid date.
 *
 * @param iso - ISO date string, e.g. "2026-03-25" or "2026-03-25T00:00:00Z"
 * @returns GDELT timestamp string
 */
export function isoToGdeltDateTime(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: "${iso}"`);
  }
  return formatGdeltDateTime(date);
}

/**
 * Builds the full GDELT DOC 2.0 API URL from typed query parameters.
 * Applies domain/country/language filters inline in the GDELT query string
 * using the `domain:`, `sourcecountry:`, and `sourcelang:` operators.
 *
 * @param params - Validated query parameters
 * @returns Fully-formed GDELT API URL string
 */
export function buildGdeltUrl(params: GdeltQueryParams): string {
  const queryParts: string[] = [params.keyword];

  // Inline GDELT operators for multi-value filters
  const hasGlobalDomain = params.domains?.some((d) =>
    ['reuters.com', 'bloomberg.com', 'cnbc.com', 'bbc.com', 'aljazeera.com'].includes(d.toLowerCase())
  );

  if (params.countries?.length && !hasGlobalDomain) {
    const countryClauses = params.countries.map((c) => `sourcecountry:${c.toUpperCase()}`);
    if (countryClauses.length === 1) {
      queryParts.push(countryClauses[0]);
    } else {
      queryParts.push(`(${countryClauses.join(' OR ')})`);
    }
  }

  if (params.domains?.length) {
    const domainClauses = params.domains.map((d) => `domain:${d.toLowerCase()}`);
    if (domainClauses.length === 1) {
      queryParts.push(domainClauses[0]);
    } else {
      queryParts.push(`(${domainClauses.join(' OR ')})`);
    }
  }

  if (params.languages?.length) {
    const langClauses = params.languages.map((l) => `sourcelang:${l}`);
    if (langClauses.length === 1) {
      queryParts.push(langClauses[0]);
    } else {
      queryParts.push(`(${langClauses.join(' OR ')})`);
    }
  }

  if (params.theme) {
    queryParts.push(`theme:${params.theme}`);
  }

  const query = queryParts.join(' ');

  if (query.length > 250) {
    throw new Error(`GDELT query too long (${query.length} chars, max ~250). Reduce filters.`);
  }

  const url = new URL(GDELT_API_BASE_URL);
  url.searchParams.set('query', query);
  url.searchParams.set('mode', GDELT_MODE);
  url.searchParams.set(
    'maxrecords',
    String(Math.min(params.maxRecords, GDELT_MAX_RECORDS)),
  );
  url.searchParams.set('format', 'json');
  url.searchParams.set('sort', params.sort);

  if (params.startDateTime) {
    url.searchParams.set('startdatetime', params.startDateTime);
  }
  if (params.endDateTime) {
    url.searchParams.set('enddatetime', params.endDateTime);
  }

  return url.toString();
}
