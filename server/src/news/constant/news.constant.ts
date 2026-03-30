/** Base URL for the GDELT DOC 2.0 API. */
export const GDELT_API_BASE_URL = 'https://api.gdeltproject.org/api/v2/doc/doc';

/** Maximum records GDELT allows per request. */
export const GDELT_MAX_RECORDS = 250;

/** Default page size when pagination is applied. */
export const DEFAULT_PAGE_SIZE = 25;

/** Default sort order. */
export const DEFAULT_SORT = 'DateDesc';

/**
 * Supported GDELT query modes.
 * artlist  → returns a list of matching articles (standard use)
 * timelinevol → volume timeline across the query window
 */
export const GDELT_MODE = 'artlist' as const;

/**
 * Common GKG themes for financial / market news filtering.
 * Pass one of these as the `theme` query param.
 */
export const GDELT_FINANCIAL_THEMES = [
  'ECON_STOCKMARKET',
  'ECON_TRADE',
  'ECON_CURRENCY',
  'ECON_BANKRUPTCY',
  'ECON_INFLATION',
  'ECONOMY_HISTORIC',
] as const;
