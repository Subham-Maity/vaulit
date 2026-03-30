/**
 * Sort options supported by the GDELT DOC 2.0 API.
 * DateDesc  → newest articles first (default)
 * DateAsc   → oldest articles first
 * ToneDesc  → most positive tone first
 * ToneAsc   → most negative tone first
 * HybridRel → relevance + recency blend
 */
export type GdeltSortOrder =
  | 'DateDesc'
  | 'DateAsc'
  | 'ToneDesc'
  | 'ToneAsc'
  | 'HybridRel';

/**
 * A single article returned by GDELT DOC 2.0 /artlist mode.
 */
export interface GdeltArticle {
  /** Full article URL. */
  url: string;

  /** Mobile-friendly article URL (may be empty). */
  url_mobile: string;

  /** Headline / title of the article. */
  title: string;

  /** ISO-8601-like date string when GDELT first indexed this article. */
  seendate: string;

  /** Social/og:image URL associated with the article. */
  socialimage: string;

  /** Domain of the source, e.g. "reuters.com". */
  domain: string;

  /** Language of the article, e.g. "English", "Tamil". */
  language: string;

  /** FIPS 2-letter country code of the source, e.g. "IN", "US". */
  sourcecountry: string;
}

/**
 * Raw JSON envelope returned by the GDELT API.
 */
export interface GdeltApiResponse {
  /** Array of matched articles. Present only in artlist mode. */
  articles?: GdeltArticle[];
}

/**
 * Internal parameters used to build the GDELT query URL.
 */
export interface GdeltQueryParams {
  /** Free-text keyword(s) to search for. */
  keyword: string;

  /** FIPS 2-letter country code(s) to filter by source country. */
  countries?: string[];

  /** Domain(s) to restrict results to, e.g. ["reuters.com"]. */
  domains?: string[];

  /** Language(s) to filter by, e.g. ["English", "Hindi"]. */
  languages?: string[];

  /** GKG theme, e.g. "ECON_STOCKMARKET". */
  theme?: string;

  /** Start of date range (inclusive). Format: YYYYMMDDHHMMSS. */
  startDateTime?: string;

  /** End of date range (inclusive). Format: YYYYMMDDHHMMSS. */
  endDateTime?: string;

  /** Maximum raw records to fetch from GDELT (1–250). */
  maxRecords: number;

  /** Sort order for results. */
  sort: GdeltSortOrder;
}

/**
 * Pagination metadata attached to every paginated response.
 */
export interface PaginationMeta {
  /** Current page number (1-indexed). */
  page: number;

  /** Number of items per page. */
  limit: number;

  /** Total articles available (capped at GDELT fetch limit). */
  total: number;

  /** Total number of pages. */
  totalPages: number;

  /** Whether a next page exists. */
  hasNextPage: boolean;

  /** Whether a previous page exists. */
  hasPrevPage: boolean;
}
