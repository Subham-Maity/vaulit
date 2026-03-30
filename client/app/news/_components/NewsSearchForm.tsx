// app/news/_components/NewsSearchForm.tsx
"use client";

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║               GDELT DOC API — QUERY RULES & CHECKPOINTS                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║ 1. QUERY LENGTH LIMIT ~250 chars. buildGdeltQuery() auto-truncates:     ║
 * ║    drops domains → countries → theme (keywords are NEVER dropped).      ║
 * ║ 2. SPACE = AND. Use explicit uppercase OR: "(Sensex OR RBI)"            ║
 * ║ 3. Multi-word phrases auto-quoted: "Nifty 50"                           ║
 * ║ 4. OR must be UPPERCASE.                                                ║
 * ║ 5. Operators go inside query= (sourcecountry:IN not &sourcecountry=IN)  ║
 * ║ 6. maxrecords hard cap = 250.                                           ║
 * ║ 7. 3-month rolling window only. Older dates → 0 results silently.       ║
 * ║ 8. One sourcelang at a time.                                            ║
 * ║ 9. Paywalled domains (reuters, bloomberg, wsj) → 0 results always.     ║
 * ║ 10. domain: is suffix match. Use domainis: for exact.                   ║
 * ║ 11. Empty strings for dates/countries/domains MUST be stripped before   ║
 * ║     sending to backend (@IsISO8601 validation rejects empty strings).   ║
 * ║     → Stripping is done in useSearchNews.ts cleanParams().              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MagnifyingGlass,
  SlidersHorizontal,
  Lightning,
  CaretDown,
  CaretUp,
  Warning,
  CheckCircle,
} from "@phosphor-icons/react";
import { SearchNewsParams } from "../hooks/useSearchNews";

// ─── Constants ────────────────────────────────────────────────────────────────
const GDELT_QUERY_CHAR_LIMIT = 250;
const GDELT_QUERY_SAFE_LIMIT = 228;
const GDELT_MAX_RECORDS = 250;

function getMinAllowedDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d.toISOString().split("T")[0];
}
function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface NewsSearchFormProps {
  formData: Partial<SearchNewsParams>;
  setFormData: (data: Partial<SearchNewsParams>) => void;
  onSearch: () => void;
  onPresetSearch: (params: SearchNewsParams) => void;
  isLoading: boolean;
}

// ─── Static options ───────────────────────────────────────────────────────────
const THEMES = [
  { value: "ECON_STOCKMARKET", label: "Stock Market" },
  { value: "ECON_TRADE", label: "Trade" },
  { value: "ECON_CURRENCY", label: "Currency" },
  { value: "ECON_INFLATION", label: "Inflation" },
  { value: "ECON_BANKRUPTCY", label: "Bankruptcy" },
  { value: "ECONOMY_HISTORIC", label: "Economy Historic" },
  { value: "ELECTION", label: "Elections" },
  { value: "LEGISLATION", label: "Legislation" },
  { value: "PROTEST", label: "Protests" },
  { value: "TERROR", label: "Terrorism" },
  { value: "NATURAL_DISASTER", label: "Natural Disasters" },
  { value: "ENV_CLIMATECHANGE", label: "Climate Change" },
  { value: "CYBER_ATTACK", label: "Cyber Attack" },
  { value: "TECH_AI", label: "AI & Tech" },
];

const SORTS = [
  { value: "DateDesc", label: "Newest First" },
  { value: "DateAsc", label: "Oldest First" },
  { value: "HybridRel", label: "Relevance + Recency" },
  { value: "ToneDesc", label: "Most Positive Tone" },
  { value: "ToneAsc", label: "Most Negative Tone" },
];

const PAYWALLED_DOMAINS = [
  "reuters.com",
  "bloomberg.com",
  "wsj.com",
  "ft.com",
  "economist.com",
  "nytimes.com",
];

const SUGGESTED_DOMAINS = [
  "economictimes.indiatimes.com",
  "livemint.com",
  "moneycontrol.com",
  "business-standard.com",
  "financialexpress.com",
  "cnbc.com",
  "aljazeera.com",
  "ndtv.com",
  "thehindu.com",
];

const SUGGESTED_LANGUAGES = [
  "English",
  "Hindi",
  "Tamil",
  "Marathi",
  "Spanish",
  "French",
  "Arabic",
  "German",
];

const LIMIT_OPTIONS = [10, 25, 50, GDELT_MAX_RECORDS];

// ─── Query builder with smart truncation ─────────────────────────────────────
export interface BuildQueryResult {
  query: string;
  truncated: boolean;
  droppedParts: string[];
}

export function buildGdeltQuery(
  params: Partial<SearchNewsParams>,
): BuildQueryResult {
  const droppedParts: string[] = [];

  let keywordBlock = "";
  if (params.keyword?.trim()) {
    const terms = params.keyword
      .split(/\s+OR\s+/i)
      .flatMap((t) => t.split(","))
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => {
        const c = t.replace(/^["']|["']$/g, "").trim();
        return c.includes(" ") ? `"${c}"` : c;
      });
    keywordBlock =
      terms.length > 1 ? `(${terms.join(" OR ")})` : (terms[0] ?? "");
  }

  let langBlock = "";
  if (params.languages?.trim()) {
    const lang = params.languages.split(",")[0].trim();
    if (lang) langBlock = `sourcelang:${lang}`;
  }

  let themeBlock = "";
  if (params.theme?.trim()) themeBlock = `theme:${params.theme.trim()}`;

  let countriesBlock = "";
  if (params.countries?.trim()) {
    const codes = params.countries
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean)
      .map((c) => `sourcecountry:${c}`);
    countriesBlock = codes.length === 1 ? codes[0] : `(${codes.join(" OR ")})`;
  }

  let domainsBlock = "";
  if (params.domains?.trim()) {
    const doms = params.domains
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean)
      .map((d) => `domain:${d}`);
    domainsBlock = doms.length === 1 ? doms[0] : `(${doms.join(" OR ")})`;
  }

  const join = (...parts: string[]) => parts.filter(Boolean).join(" ");
  let query = join(
    keywordBlock,
    langBlock,
    themeBlock,
    countriesBlock,
    domainsBlock,
  );

  if (query.length > GDELT_QUERY_SAFE_LIMIT && domainsBlock) {
    droppedParts.push("domains");
    domainsBlock = "";
    query = join(keywordBlock, langBlock, themeBlock, countriesBlock);
  }
  if (query.length > GDELT_QUERY_SAFE_LIMIT && countriesBlock) {
    droppedParts.push("countries");
    countriesBlock = "";
    query = join(keywordBlock, langBlock, themeBlock);
  }
  if (query.length > GDELT_QUERY_SAFE_LIMIT && themeBlock) {
    droppedParts.push("theme");
    themeBlock = "";
    query = join(keywordBlock, langBlock);
  }

  return { query, truncated: droppedParts.length > 0, droppedParts };
}

// ─────────────────────────────────────────────────────────────────────────────
// ─── 100 MARKET PRESETS ───────────────────────────────────────────────────────
// Rules: no domains in presets (eat chars), keyword+country+theme only.
// Each preset verified < GDELT_QUERY_SAFE_LIMIT via buildGdeltQuery.
// sort chosen to maximise signal quality for AI training.
// ─────────────────────────────────────────────────────────────────────────────
export interface MarketPreset {
  label: string;
  emoji: string;
  category: string;
  description: string;
  params: SearchNewsParams;
}

export const MARKET_PRESETS: MarketPreset[] = [
  // 🇮🇳 Indian Indices
  {
    label: "Nifty 50",
    emoji: "📈",
    category: "🇮🇳 Indices",
    description: "NSE index moves, FII activity, circuit breakers",
    params: {
      keyword: "Nifty 50",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "BSE Sensex",
    emoji: "📊",
    category: "🇮🇳 Indices",
    description: "BSE 30 index levels, daily moves, analyst targets",
    params: {
      keyword: "BSE Sensex",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Nifty Bank",
    emoji: "🏦",
    category: "🇮🇳 Indices",
    description: "Banking sector index, PSU vs private bank moves",
    params: {
      keyword: "Nifty Bank",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Nifty IT",
    emoji: "💻",
    category: "🇮🇳 Indices",
    description: "IT sector performance, export revenue, guidance cuts",
    params: {
      keyword: "Nifty IT index",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Nifty Midcap",
    emoji: "📉",
    category: "🇮🇳 Indices",
    description: "Mid-cap segment flows, rally/correction signals",
    params: {
      keyword: "Nifty Midcap",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Nifty Pharma",
    emoji: "💊",
    category: "🇮🇳 Indices",
    description: "Pharma sector: FDA approvals, drug pricing, ANDA",
    params: {
      keyword: "Nifty Pharma",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Nifty Auto",
    emoji: "🚗",
    category: "🇮🇳 Indices",
    description: "Auto sector index, monthly sales data, EV transition",
    params: {
      keyword: "Nifty Auto",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Nifty Realty",
    emoji: "🏗️",
    category: "🇮🇳 Indices",
    description: "Real estate stocks, housing demand, launches",
    params: {
      keyword: "Nifty Realty",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Nifty FMCG",
    emoji: "🛒",
    category: "🇮🇳 Indices",
    description: "FMCG volume growth, rural demand, margin trends",
    params: {
      keyword: "Nifty FMCG",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "India VIX",
    emoji: "⚡",
    category: "🇮🇳 Indices",
    description: "Fear gauge, volatility spikes, expiry week swings",
    params: {
      keyword: "India VIX volatility",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "ToneAsc",
      limit: 50,
    },
  },
  {
    label: "NSE Circuit",
    emoji: "🔴",
    category: "🇮🇳 Indices",
    description: "Circuit breakers triggered, halt events, crash news",
    params: {
      keyword: "NSE circuit breaker",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "ToneAsc",
      limit: 50,
    },
  },
  {
    label: "India Rally",
    emoji: "🚀",
    category: "🇮🇳 Indices",
    description: "Bull run signals, all-time highs, upside breakout news",
    params: {
      keyword: "India market rally bull",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "ToneDesc",
      limit: 50,
    },
  },
  {
    label: "India Crash",
    emoji: "💥",
    category: "🇮🇳 Indices",
    description: "Crash, fall, selloff events in Indian markets",
    params: {
      keyword: "India market crash fall",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "ToneAsc",
      limit: 50,
    },
  },
  {
    label: "F&O Expiry",
    emoji: "📅",
    category: "🇮🇳 Indices",
    description: "Derivatives expiry dynamics, rollover, OI buildup data",
    params: {
      keyword: "F&O expiry derivatives",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "IPO Listings",
    emoji: "🎯",
    category: "🇮🇳 Indices",
    description: "New IPO listings, GMP, subscription status data",
    params: {
      keyword: "IPO India listing",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },

  // 🏛️ RBI & Policy
  {
    label: "RBI Repo Rate",
    emoji: "🏛️",
    category: "🏛️ RBI & Policy",
    description: "Repo rate decisions, MPC vote split, rate trajectory",
    params: {
      keyword: "RBI repo rate",
      countries: "IN",
      theme: "ECON_INFLATION",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "RBI MPC",
    emoji: "📋",
    category: "🏛️ RBI & Policy",
    description: "Full MPC meeting coverage, minutes, dissent notes",
    params: {
      keyword: "RBI monetary policy MPC",
      countries: "IN",
      theme: "ECON_INFLATION",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "SEBI Rules",
    emoji: "⚖️",
    category: "🏛️ RBI & Policy",
    description: "SEBI circulars, F&O rules, insider trading crackdown",
    params: {
      keyword: "SEBI regulation",
      countries: "IN",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Union Budget",
    emoji: "💰",
    category: "🏛️ RBI & Policy",
    description: "Budget announcements, capex plans, sector tax changes",
    params: {
      keyword: "Union Budget India",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "India GDP",
    emoji: "📐",
    category: "🏛️ RBI & Policy",
    description: "GDP growth prints, advance estimates, sector breakdown",
    params: {
      keyword: "India GDP growth",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "FII DII Flows",
    emoji: "💸",
    category: "🏛️ RBI & Policy",
    description: "Foreign & domestic institution daily buy/sell data",
    params: {
      keyword: "FII DII flows India",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "India CPI",
    emoji: "📊",
    category: "🏛️ RBI & Policy",
    description: "Consumer price inflation monthly prints vs estimates",
    params: {
      keyword: "India inflation CPI",
      countries: "IN",
      theme: "ECON_INFLATION",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "India WPI",
    emoji: "📊",
    category: "🏛️ RBI & Policy",
    description: "Wholesale price index, input cost pressure on margins",
    params: {
      keyword: "India WPI wholesale",
      countries: "IN",
      theme: "ECON_INFLATION",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Forex Reserves",
    emoji: "🏦",
    category: "🏛️ RBI & Policy",
    description: "RBI foreign exchange reserve weekly data, import cover",
    params: {
      keyword: "India forex reserves RBI",
      countries: "IN",
      theme: "ECON_CURRENCY",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "India FDI",
    emoji: "💰",
    category: "🏛️ RBI & Policy",
    description: "Foreign direct investment inflows by sector and country",
    params: {
      keyword: "India FDI investment",
      countries: "IN",
      theme: "ECON_TRADE",
      sort: "DateDesc",
      limit: 50,
    },
  },

  // 🥇 Gold & Metals
  {
    label: "Gold Price",
    emoji: "🥇",
    category: "🥇 Gold & Metals",
    description: "Spot gold price moves, XAU/USD levels, analyst forecasts",
    params: {
      keyword: "gold price",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Gold ETF India",
    emoji: "📦",
    category: "🥇 Gold & Metals",
    description: "GOLDBEES, gold ETF AUM, SIP flows in gold funds",
    params: {
      keyword: "gold ETF India GOLDBEES",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Sovereign Gold",
    emoji: "📜",
    category: "🥇 Gold & Metals",
    description: "SGB issue price, returns vs physical, RBI announcements",
    params: {
      keyword: "Sovereign Gold Bond SGB",
      countries: "IN",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "COMEX Gold",
    emoji: "🔮",
    category: "🥇 Gold & Metals",
    description: "COMEX futures, CoT positioning, options activity",
    params: {
      keyword: "COMEX gold futures",
      countries: "US",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Gold vs Dollar",
    emoji: "💱",
    category: "🥇 Gold & Metals",
    description: "Inverse gold-dollar relationship, DXY impact",
    params: {
      keyword: "gold dollar rally",
      theme: "ECON_CURRENCY",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Silver Price",
    emoji: "🥈",
    category: "🥇 Gold & Metals",
    description: "Silver spot, industrial demand, gold-silver ratio moves",
    params: {
      keyword: "silver price",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "SILVERBEES",
    emoji: "📦",
    category: "🥇 Gold & Metals",
    description: "India silver ETF NAV, flows, redemptions",
    params: {
      keyword: "silver ETF India SILVERBEES",
      countries: "IN",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Gold Demand",
    emoji: "💍",
    category: "🥇 Gold & Metals",
    description: "WGC demand report, jewellery, central bank buying",
    params: {
      keyword: "gold demand jewellery India",
      countries: "IN",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Gold Import",
    emoji: "📥",
    category: "🥇 Gold & Metals",
    description: "India gold imports, customs duty, smuggling crackdown",
    params: {
      keyword: "gold import India",
      countries: "IN",
      theme: "ECON_TRADE",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "RBI Gold",
    emoji: "🏛️",
    category: "🥇 Gold & Metals",
    description: "RBI gold reserve purchases, BoE repatriation news",
    params: {
      keyword: "RBI gold reserves",
      countries: "IN",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Gold Bearish",
    emoji: "🐻",
    category: "🥇 Gold & Metals",
    description: "Gold selloff, ETF outflows, price correction signals",
    params: {
      keyword: "gold price fall bearish",
      theme: "ECON_STOCKMARKET",
      sort: "ToneAsc",
      limit: 50,
    },
  },
  {
    label: "Metals Rally",
    emoji: "🚀",
    category: "🥇 Gold & Metals",
    description: "Broad precious metals upswing, multi-commodity rally",
    params: {
      keyword: "precious metals rally",
      theme: "ECON_STOCKMARKET",
      sort: "ToneDesc",
      limit: 50,
    },
  },

  // 🛢️ Oil & Energy
  {
    label: "Crude WTI",
    emoji: "🛢️",
    category: "🛢️ Oil & Energy",
    description: "WTI crude levels, US EIA inventory data, API report",
    params: {
      keyword: "crude oil WTI",
      countries: "US",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Brent Crude",
    emoji: "🌊",
    category: "🛢️ Oil & Energy",
    description: "Brent pricing, global demand outlook, spread vs WTI",
    params: {
      keyword: "Brent crude oil",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "OPEC Cuts",
    emoji: "⛽",
    category: "🛢️ Oil & Energy",
    description: "OPEC+ production decisions, compliance, Saudi Arabia output",
    params: {
      keyword: "OPEC production cut",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "India Oil Import",
    emoji: "📥",
    category: "🛢️ Oil & Energy",
    description: "India crude import volumes, Russia discount oil flows",
    params: {
      keyword: "India oil imports crude",
      countries: "IN",
      theme: "ECON_TRADE",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Petrol Diesel",
    emoji: "⛽",
    category: "🛢️ Oil & Energy",
    description: "Domestic fuel prices, OMC margins, state election impact",
    params: {
      keyword: "petrol diesel price India",
      countries: "IN",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Natural Gas",
    emoji: "🔥",
    category: "🛢️ Oil & Energy",
    description: "Natural gas prices, LNG demand, Europe storage levels",
    params: {
      keyword: "natural gas price",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Oil Geopolitics",
    emoji: "🌍",
    category: "🛢️ Oil & Energy",
    description: "Middle East conflict, Hormuz, supply disruption risk premium",
    params: {
      keyword: "oil supply geopolitics",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Energy Stocks",
    emoji: "⚡",
    category: "🛢️ Oil & Energy",
    description: "Oil & gas company results, upstream/downstream earnings",
    params: {
      keyword: "energy sector stocks",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },

  // 🌐 Global Macro
  {
    label: "Fed Rate",
    emoji: "🇺🇸",
    category: "🌐 Global Macro",
    description: "FOMC decisions, rate path, dot plot, meeting minutes",
    params: {
      keyword: "Federal Reserve rate",
      countries: "US",
      theme: "ECON_INFLATION",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Powell Speech",
    emoji: "🎙️",
    category: "🌐 Global Macro",
    description: "Fed Chair statements, press conference hawkish/dovish tone",
    params: {
      keyword: "Powell Federal Reserve",
      countries: "US",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "US CPI",
    emoji: "📊",
    category: "🌐 Global Macro",
    description: "US consumer price inflation monthly print vs consensus",
    params: {
      keyword: "US inflation CPI",
      countries: "US",
      theme: "ECON_INFLATION",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "US Recession",
    emoji: "📉",
    category: "🌐 Global Macro",
    description: "Recession fears, yield curve inversion, PMI contraction",
    params: {
      keyword: "US recession",
      countries: "US",
      theme: "ECON_STOCKMARKET",
      sort: "ToneAsc",
      limit: 50,
    },
  },
  {
    label: "US Yields",
    emoji: "📈",
    category: "🌐 Global Macro",
    description: "10Y/2Y Treasury yields, bond market signals, inversion",
    params: {
      keyword: "US Treasury yield",
      countries: "US",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "ECB Rates",
    emoji: "🇪🇺",
    category: "🌐 Global Macro",
    description: "ECB rate decisions, Lagarde comments, euro area inflation",
    params: {
      keyword: "ECB interest rate",
      theme: "ECON_INFLATION",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "China Economy",
    emoji: "🇨🇳",
    category: "🌐 Global Macro",
    description: "China slowdown, property crisis, stimulus measures",
    params: {
      keyword: "China economy slowdown",
      countries: "CN",
      theme: "ECON_STOCKMARKET",
      sort: "ToneAsc",
      limit: 50,
    },
  },
  {
    label: "Global Recession",
    emoji: "🌐",
    category: "🌐 Global Macro",
    description: "Global growth downgrade, IMF/World Bank recession warnings",
    params: {
      keyword: "global recession",
      theme: "ECON_STOCKMARKET",
      sort: "ToneAsc",
      limit: 50,
    },
  },
  {
    label: "EM Selloff",
    emoji: "📉",
    category: "🌐 Global Macro",
    description: "Emerging market capital flight, contagion, dollar strength",
    params: {
      keyword: "emerging markets selloff",
      theme: "ECON_STOCKMARKET",
      sort: "ToneAsc",
      limit: 50,
    },
  },
  {
    label: "G20 Summit",
    emoji: "🤝",
    category: "🌐 Global Macro",
    description: "G20 communiqué, trade agreements, debt relief talks",
    params: {
      keyword: "G20 economy",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },

  // 💱 Forex
  {
    label: "USD/INR",
    emoji: "💱",
    category: "💱 Forex",
    description: "Rupee-dollar rate, RBI intervention, importer hedging",
    params: {
      keyword: "USD INR exchange rate",
      countries: "IN",
      theme: "ECON_CURRENCY",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Rupee Fall",
    emoji: "📉",
    category: "💱 Forex",
    description: "Rupee depreciation, record lows, FPI outflow pressure",
    params: {
      keyword: "rupee dollar fall",
      countries: "IN",
      theme: "ECON_CURRENCY",
      sort: "ToneAsc",
      limit: 50,
    },
  },
  {
    label: "DXY Index",
    emoji: "🇺🇸",
    category: "💱 Forex",
    description: "US Dollar Index, DXY rally/fall, basket currency moves",
    params: {
      keyword: "DXY dollar index",
      countries: "US",
      theme: "ECON_CURRENCY",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Currency War",
    emoji: "⚔️",
    category: "💱 Forex",
    description: "Competitive devaluation, beggar-thy-neighbour FX policy",
    params: {
      keyword: "currency war devaluation",
      theme: "ECON_CURRENCY",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Yen/Dollar",
    emoji: "🇯🇵",
    category: "💱 Forex",
    description: "BOJ intervention, JPY weakness, carry trade unwind risk",
    params: {
      keyword: "yen dollar BOJ",
      theme: "ECON_CURRENCY",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "EUR/USD",
    emoji: "🇪🇺",
    category: "💱 Forex",
    description: "Euro-dollar parity risk, ECB vs Fed policy divergence",
    params: {
      keyword: "euro dollar EUR/USD",
      theme: "ECON_CURRENCY",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "BRICS Currency",
    emoji: "🌐",
    category: "💱 Forex",
    description: "BRICS de-dollarisation, alternative reserve currency push",
    params: {
      keyword: "BRICS currency dollar",
      theme: "ECON_CURRENCY",
      sort: "DateDesc",
      limit: 50,
    },
  },

  // 🏦 Indian Banks
  {
    label: "SBI Results",
    emoji: "🏦",
    category: "🏦 Indian Banks",
    description: "SBI quarterly earnings, NIM, GNPA, provisions",
    params: {
      keyword: "SBI results earnings",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "HDFC Bank",
    emoji: "🏦",
    category: "🏦 Indian Banks",
    description: "HDFC Bank results, merger integration, loan growth",
    params: {
      keyword: "HDFC Bank earnings",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "ICICI Bank",
    emoji: "🏦",
    category: "🏦 Indian Banks",
    description: "ICICI Bank quarterly results, CASA ratio, retail loans",
    params: {
      keyword: "ICICI Bank results",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Banking NPA",
    emoji: "⚠️",
    category: "🏦 Indian Banks",
    description: "Bad loans, GNPA, NNPA ratios, IBC resolution cases",
    params: {
      keyword: "Indian bank NPA loans",
      countries: "IN",
      theme: "ECON_BANKRUPTCY",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Mutual Funds",
    emoji: "📂",
    category: "🏦 Indian Banks",
    description: "SIP inflows, AUM growth, top performing category flows",
    params: {
      keyword: "mutual fund India SIP",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "AMFI Data",
    emoji: "📊",
    category: "🏦 Indian Banks",
    description: "Monthly AMFI category-wise MF flow data breakdown",
    params: {
      keyword: "AMFI mutual fund flows",
      countries: "IN",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "UPI Payments",
    emoji: "📱",
    category: "🏦 Indian Banks",
    description: "UPI transaction volumes, monthly records, ecosystem news",
    params: {
      keyword: "UPI digital payments India",
      countries: "IN",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Parag Parikh",
    emoji: "🌍",
    category: "🏦 Indian Banks",
    description: "PPFCF fund news, foreign stock exposure, NAV performance",
    params: {
      keyword: "Parag Parikh flexi cap",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },

  // 💻 IT & Tech
  {
    label: "TCS Results",
    emoji: "💻",
    category: "💻 IT & Tech",
    description: "TCS quarterly revenue, deal wins, headcount guidance",
    params: {
      keyword: "TCS quarterly results",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Infosys",
    emoji: "💻",
    category: "💻 IT & Tech",
    description: "Infosys revenue guidance, attrition rate, large deal wins",
    params: {
      keyword: "Infosys guidance revenue",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Wipro",
    emoji: "💻",
    category: "💻 IT & Tech",
    description: "Wipro quarterly earnings, CEO commentary, order book",
    params: {
      keyword: "Wipro earnings guidance",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "NASDAQ",
    emoji: "🚀",
    category: "💻 IT & Tech",
    description: "NASDAQ composite moves, big tech earnings impact",
    params: {
      keyword: "NASDAQ tech rally",
      countries: "US",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "AI Stocks",
    emoji: "🤖",
    category: "💻 IT & Tech",
    description: "AI-driven stock moves, Nvidia, semiconductor demand cycle",
    params: {
      keyword: "AI stocks market",
      theme: "TECH_AI",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "IT Exports",
    emoji: "📤",
    category: "💻 IT & Tech",
    description: "India software export data, NASSCOM projections, visa issues",
    params: {
      keyword: "IT exports India software",
      countries: "IN",
      theme: "ECON_TRADE",
      sort: "DateDesc",
      limit: 50,
    },
  },

  // 🚗 Auto & Pharma
  {
    label: "Auto Sales",
    emoji: "🚗",
    category: "🚗 Auto & Pharma",
    description: "Monthly wholesale sales, SIAM data, 2W/3W/4W breakdown",
    params: {
      keyword: "auto sales India monthly",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "EV Policy",
    emoji: "⚡",
    category: "🚗 Auto & Pharma",
    description: "EV policy, FAME subsidies, charging infra investments",
    params: {
      keyword: "EV electric vehicle India",
      countries: "IN",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Tata Motors",
    emoji: "🏭",
    category: "🚗 Auto & Pharma",
    description: "Tata Motors JLR results, EV ramp, debt reduction news",
    params: {
      keyword: "Tata Motors earnings",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Maruti Sales",
    emoji: "🚙",
    category: "🚗 Auto & Pharma",
    description: "Maruti monthly sales, waiting period, rural demand signal",
    params: {
      keyword: "Maruti Suzuki sales",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Sun Pharma",
    emoji: "💊",
    category: "🚗 Auto & Pharma",
    description: "Sun Pharma FDA approvals/warnings, specialty US revenue",
    params: {
      keyword: "Sun Pharma FDA",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Dr Reddy",
    emoji: "🔬",
    category: "🚗 Auto & Pharma",
    description: "Dr Reddy quarterly, ANDA filings, biosimilar pipeline",
    params: {
      keyword: "Dr Reddy results",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },

  // 🌍 Geopolitics
  {
    label: "India-China",
    emoji: "🌏",
    category: "🌍 Geopolitics",
    description: "Border standoff, trade deficit, import restriction news",
    params: {
      keyword: "India China trade border",
      countries: "IN",
      theme: "ECON_TRADE",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "India-US Trade",
    emoji: "🤝",
    category: "🌍 Geopolitics",
    description: "US tariffs on India, GSP, bilateral trade deal progress",
    params: {
      keyword: "India US trade tariffs",
      countries: "IN",
      theme: "ECON_TRADE",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Russia-Ukraine",
    emoji: "⚔️",
    category: "🌍 Geopolitics",
    description: "War impact on commodities, grain corridor, energy sanctions",
    params: {
      keyword: "Russia Ukraine commodity",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Middle East Oil",
    emoji: "🛢️",
    category: "🌍 Geopolitics",
    description: "Hormuz risk, Israel-Gaza, Houthi shipping attack impacts",
    params: {
      keyword: "Middle East oil supply",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "US-China",
    emoji: "🇺🇸",
    category: "🌍 Geopolitics",
    description: "Trade tariffs, chip export ban, tech decoupling signals",
    params: {
      keyword: "US China trade tariff",
      theme: "ECON_TRADE",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Sanctions",
    emoji: "🚫",
    category: "🌍 Geopolitics",
    description: "Economic sanctions, commodity supply disruption chains",
    params: {
      keyword: "sanctions commodity",
      theme: "ECON_TRADE",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Supply Chain",
    emoji: "⛓️",
    category: "🌍 Geopolitics",
    description: "Global supply chain stress, reshoring, China+1 strategy",
    params: {
      keyword: "supply chain disruption",
      theme: "ECON_TRADE",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Israel Iran",
    emoji: "🚨",
    category: "🌍 Geopolitics",
    description: "Iran nuclear, Israel strikes, oil supply risk premium spikes",
    params: {
      keyword: "Israel Iran oil",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Taiwan Chip",
    emoji: "🌊",
    category: "🌍 Geopolitics",
    description: "China-Taiwan tension, semiconductor supply chain risk",
    params: {
      keyword: "Taiwan China semiconductor",
      theme: "ECON_TRADE",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "India Pakistan",
    emoji: "⚠️",
    category: "🌍 Geopolitics",
    description: "Bilateral tension, ceasefire, border skirmish coverage",
    params: {
      keyword: "India Pakistan",
      countries: "IN",
      theme: "PROTEST",
      sort: "DateDesc",
      limit: 50,
    },
  },

  // ₿ Crypto
  {
    label: "Bitcoin",
    emoji: "₿",
    category: "₿ Crypto",
    description: "Bitcoin price moves, halving cycle, ETF inflow/outflow",
    params: {
      keyword: "Bitcoin price",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Crypto India",
    emoji: "🔒",
    category: "₿ Crypto",
    description: "India crypto tax, SEBI/RBI stance, exchange regulations",
    params: {
      keyword: "crypto regulation India",
      countries: "IN",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Digital Rupee",
    emoji: "🏦",
    category: "₿ Crypto",
    description: "CBDC pilot expansion, retail e-rupee adoption progress",
    params: {
      keyword: "digital rupee CBDC RBI",
      countries: "IN",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Ethereum",
    emoji: "🔷",
    category: "₿ Crypto",
    description: "ETH price, staking yields, protocol upgrade news",
    params: {
      keyword: "Ethereum price market",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },

  // 🏗️ Infra & Realty
  {
    label: "India Infra",
    emoji: "🏗️",
    category: "🏗️ Infra & Realty",
    description: "Capex spending, road/rail/port project awards and wins",
    params: {
      keyword: "India infrastructure spending",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Real Estate",
    emoji: "🏠",
    category: "🏗️ Infra & Realty",
    description: "Housing sales, launches, price appreciation in metros",
    params: {
      keyword: "real estate India housing",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "Cement",
    emoji: "🧱",
    category: "🏗️ Infra & Realty",
    description: "Cement volume growth, realization per bag, capacity news",
    params: {
      keyword: "cement demand India",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },
  {
    label: "L&T Orders",
    emoji: "📋",
    category: "🏗️ Infra & Realty",
    description: "L&T order inflows, project wins, backlog size updates",
    params: {
      keyword: "L&T Larsen Toubro orders",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "DateDesc",
      limit: 50,
    },
  },

  // 🔥 Signal Bundles
  {
    label: "🔥 India Macro",
    emoji: "🔥",
    category: "🔥 Signal Bundles",
    description:
      "Composite: Nifty + RBI + inflation — core Indian macro bundle",
    params: {
      keyword: "Nifty RBI inflation",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "HybridRel",
      limit: 50,
    },
  },
  {
    label: "🔥 Gold + Oil",
    emoji: "🔥",
    category: "🔥 Signal Bundles",
    description: "Composite: gold + oil — highest signal density for macro AI",
    params: {
      keyword: "gold oil commodity",
      theme: "ECON_STOCKMARKET",
      sort: "HybridRel",
      limit: 50,
    },
  },
  {
    label: "🔥 Risk Off",
    emoji: "🔥",
    category: "🔥 Signal Bundles",
    description:
      "Composite: selloff + recession — best bear signal training set",
    params: {
      keyword: "market selloff recession",
      theme: "ECON_STOCKMARKET",
      sort: "ToneAsc",
      limit: 50,
    },
  },
  {
    label: "🔥 Geo Risk",
    emoji: "🔥",
    category: "🔥 Signal Bundles",
    description: "Composite: geopolitical stress → market reaction patterns",
    params: {
      keyword: "geopolitical risk market",
      theme: "ECON_STOCKMARKET",
      sort: "ToneAsc",
      limit: 100,
    },
  },
  {
    label: "🔥 Bull India",
    emoji: "🔥",
    category: "🔥 Signal Bundles",
    description:
      "Composite: bullish India signals — positive class training labels",
    params: {
      keyword: "India growth investment",
      countries: "IN",
      theme: "ECON_STOCKMARKET",
      sort: "ToneDesc",
      limit: 50,
    },
  },
  {
    label: "🔥 Fed + INR",
    emoji: "🔥",
    category: "🔥 Signal Bundles",
    description: "Composite: Fed rate decisions → rupee + Nifty impact chain",
    params: {
      keyword: "Fed rates rupee dollar",
      theme: "ECON_CURRENCY",
      sort: "HybridRel",
      limit: 50,
    },
  },
];

export const PRESET_CATEGORIES = Array.from(
  new Set(MARKET_PRESETS.map((p) => p.category)),
);

// ─────────────────────────────────────────────────────────────────────────────

export function NewsSearchForm({
  formData,
  setFormData,
  onSearch,
  onPresetSearch,
  isLoading,
}: NewsSearchFormProps) {
  const [activeCategory, setActiveCategory] = useState<string>(
    PRESET_CATEGORIES[0],
  );
  const [manualOpen, setManualOpen] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const handleSelectChange = (
    name: keyof SearchNewsParams,
    value: string | number,
  ) => {
    setFormData({ ...formData, [name]: value });
  };
  const handleTagClick = (tag: string) => {
    const existing = (formData.keyword || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (existing.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
    setFormData({ ...formData, keyword: [...existing, tag].join(", ") });
  };
  const handleCommaTagClick = (field: keyof SearchNewsParams, tag: string) => {
    const current = (formData[field] as string) || "";
    if (current.toLowerCase().includes(tag.toLowerCase())) return;
    setFormData({ ...formData, [field]: current ? `${current},${tag}` : tag });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.keyword?.trim()) {
      alert("⚠️ Keyword is required.");
      return;
    }
    const { query, truncated, droppedParts } = buildGdeltQuery(formData);
    if (query.length > GDELT_QUERY_CHAR_LIMIT) {
      alert(
        `⚠️ Query too long even after auto-trim!\n${query.length}/${GDELT_QUERY_CHAR_LIMIT} chars.\nShorten keywords.`,
      );
      return;
    }
    if (truncated) {
      const ok = confirm(
        `⚠️ Query auto-trimmed. Dropped: ${droppedParts.join(", ")}\n\nContinue?`,
      );
      if (!ok) return;
    }
    const minDate = getMinAllowedDate();
    if (formData.startDate && formData.startDate < minDate) {
      alert(`⚠️ Start date outside 3-month window. Earliest: ${minDate}`);
      return;
    }
    if (
      formData.startDate &&
      formData.endDate &&
      formData.endDate < formData.startDate
    ) {
      alert("⚠️ End date cannot be before start date.");
      return;
    }
    if (
      formData.startDate &&
      formData.endDate &&
      !hasWeekdayInRange(formData.startDate, formData.endDate)
    ) {
      const ok = confirm("⚠️ Date range is weekends only. Continue?");
      if (!ok) return;
    }
    onSearch();
  };

  const {
    query: liveQuery,
    truncated,
    droppedParts,
  } = buildGdeltQuery(formData);
  const queryLength = liveQuery.length;
  const isQueryTooLong = queryLength > GDELT_QUERY_CHAR_LIMIT;
  const isQueryNearLimit = queryLength > GDELT_QUERY_CHAR_LIMIT * 0.85;
  const hasPaywalledDomain = (formData.domains || "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .some((d) => PAYWALLED_DOMAINS.includes(d));
  const presetsInCategory = MARKET_PRESETS.filter(
    (p) => p.category === activeCategory,
  );

  return (
    <div className="space-y-3">
      {/* ══════════ SECTION A — QUICK PRESETS ══════════ */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
          <Lightning
            size={15}
            weight="fill"
            className="text-primary shrink-0"
          />
          <span className="text-sm font-semibold">Quick Presets</span>
          <span className="ml-auto text-[10px] text-muted-foreground tabular-nums shrink-0">
            {MARKET_PRESETS.length} presets
          </span>
        </div>

        {/* Category scroll tabs */}
        <div className="flex overflow-x-auto gap-1 px-2 py-2 border-b border-border bg-muted/10 scrollbar-thin">
          {PRESET_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 text-[10px] font-medium px-2.5 py-1 rounded-full border transition-all whitespace-nowrap ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Preset cards */}
        <div className="p-2 space-y-1.5 max-h-[400px] overflow-y-auto">
          {presetsInCategory.map((preset) => {
            const chips: { label: string; color: string }[] = [];
            if (preset.params.countries)
              chips.push({
                label: preset.params.countries,
                color: "bg-blue-500/10 text-blue-600 border-blue-200",
              });
            if (preset.params.theme)
              chips.push({
                label:
                  THEMES.find((t) => t.value === preset.params.theme)?.label ??
                  preset.params.theme,
                color: "bg-purple-500/10 text-purple-600 border-purple-200",
              });
            if (preset.params.sort && preset.params.sort !== "DateDesc")
              chips.push({
                label:
                  SORTS.find((s) => s.value === preset.params.sort)?.label ??
                  "",
                color: "bg-amber-500/10 text-amber-600 border-amber-200",
              });
            chips.push({
              label: `${preset.params.limit} results`,
              color: "bg-muted text-muted-foreground border-border",
            });

            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => onPresetSearch(preset.params)}
                disabled={isLoading}
                className="w-full text-left group flex items-start gap-2.5 px-3 py-2.5 rounded-lg border border-border bg-background hover:bg-primary/5 hover:border-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-lg leading-none mt-0.5 shrink-0">
                  {preset.emoji}
                </span>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-baseline justify-between gap-1.5">
                    <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors leading-none">
                      {preset.label}
                    </span>
                    <code className="shrink-0 text-[9px] font-mono px-1.5 py-px rounded bg-muted text-muted-foreground max-w-[130px] truncate">
                      {preset.params.keyword}
                    </code>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    {preset.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {chips.map(
                      (chip) =>
                        chip.label && (
                          <span
                            key={chip.label}
                            className={`text-[9px] px-1.5 py-px rounded-full border font-medium ${chip.color}`}
                          >
                            {chip.label}
                          </span>
                        ),
                    )}
                  </div>
                </div>
                <MagnifyingGlass
                  size={13}
                  className="shrink-0 mt-1 text-muted-foreground/50 group-hover:text-primary transition-colors"
                />
              </button>
            );
          })}
        </div>

        <div className="px-3 py-2 border-t border-border bg-muted/10">
          <p className="text-[9px] text-muted-foreground">
            💡 Click any card to <strong>instantly search</strong>. Colored
            chips show what filters are active. No form interaction needed.
          </p>
        </div>
      </div>

      {/* ══════════ SECTION B — MANUAL FILTERS ══════════ */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setManualOpen((v) => !v)}
          className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/30 transition-colors"
        >
          <SlidersHorizontal
            size={15}
            className="text-muted-foreground shrink-0"
          />
          <span className="text-sm font-semibold">Manual Filters</span>
          {formData.keyword && (
            <code className="ml-1 text-[9px] px-1.5 py-px rounded bg-primary/10 text-primary border border-primary/20 max-w-[120px] truncate">
              {formData.keyword}
            </code>
          )}
          <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
            {manualOpen ? "collapse" : "expand for custom query"}
          </span>
          <span className="text-muted-foreground shrink-0">
            {manualOpen ? <CaretUp size={13} /> : <CaretDown size={13} />}
          </span>
        </button>

        {manualOpen && (
          <form
            onSubmit={handleSubmit}
            className="border-t border-border px-4 pb-5 pt-4 space-y-4"
          >
            {/* Live query bar */}
            <div
              className={`text-xs px-3 py-2.5 rounded-lg space-y-2 transition-colors border ${
                isQueryTooLong
                  ? "bg-destructive/10 border-destructive/30 text-destructive"
                  : isQueryNearLimit
                    ? "bg-yellow-500/10 border-yellow-400/30 text-yellow-700"
                    : "bg-muted/40 border-border text-muted-foreground"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {isQueryTooLong ? (
                    <Warning size={12} />
                  ) : (
                    <CheckCircle size={12} className="text-emerald-500" />
                  )}
                  <span className="font-semibold tabular-nums">
                    {queryLength} / {GDELT_QUERY_CHAR_LIMIT} chars
                  </span>
                  {isQueryTooLong && <span>— Too long!</span>}
                  {!isQueryTooLong && isQueryNearLimit && (
                    <span>— Near limit</span>
                  )}
                </div>
                {truncated && (
                  <span className="text-[9px] text-yellow-600 font-medium shrink-0">
                    ⚡ will drop: {droppedParts.join(", ")}
                  </span>
                )}
              </div>
              {/* Raw query preview */}
              <code className="block text-[9px] font-mono break-all bg-background/60 rounded px-2 py-1.5 border border-border/50 leading-relaxed">
                {liveQuery || "(empty — type a keyword)"}
              </code>
            </div>

            {/* Keyword */}
            <div className="space-y-1.5">
              <Label htmlFor="keyword" className="text-xs font-semibold">
                Keywords <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <MagnifyingGlass
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="keyword"
                  name="keyword"
                  placeholder='e.g. Sensex, "Nifty 50", RBI'
                  value={formData.keyword || ""}
                  onChange={handleChange}
                  className="pl-8 text-sm"
                  required
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Comma = OR · Multi-word auto-quoted · Max ~5 terms for safety
              </p>
              <div className="flex flex-wrap gap-1 pt-0.5">
                {[
                  "Sensex",
                  "Nifty 50",
                  "RBI",
                  "Gold Price",
                  "Crude Oil",
                  "Federal Reserve",
                  "Inflation",
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagClick(tag)}
                    className="text-[10px] px-2 py-1 rounded-full bg-secondary/50 border border-border hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Countries */}
              <div className="space-y-1.5">
                <Label htmlFor="countries" className="text-xs font-semibold">
                  Countries
                </Label>
                <Input
                  id="countries"
                  name="countries"
                  placeholder="IN,US"
                  value={formData.countries || ""}
                  onChange={handleChange}
                  className="text-xs"
                />
                <p className="text-[9px] text-muted-foreground">
                  2-char FIPS · ~20 chars each
                </p>
                <div className="flex flex-wrap gap-1">
                  {["IN", "US", "GB", "CN", "RU", "AE"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleCommaTagClick("countries", c)}
                      className="text-[9px] px-1.5 py-px rounded bg-secondary/40 border border-border hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div className="space-y-1.5">
                <Label htmlFor="languages" className="text-xs font-semibold">
                  Language
                </Label>
                <Select
                  value={formData.languages || ""}
                  onValueChange={(val) =>
                    handleSelectChange("languages", val === "any" ? "" : val)
                  }
                >
                  <SelectTrigger id="languages" className="text-xs">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Language</SelectItem>
                    {SUGGESTED_LANGUAGES.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {lang}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[9px] text-muted-foreground">
                  GDELT: one language only
                </p>
              </div>

              {/* Theme */}
              <div className="space-y-1.5">
                <Label htmlFor="theme" className="text-xs font-semibold">
                  Theme
                </Label>
                <Select
                  value={formData.theme || ""}
                  onValueChange={(val) =>
                    handleSelectChange("theme", val === "any" ? "" : val)
                  }
                >
                  <SelectTrigger id="theme" className="text-xs">
                    <SelectValue placeholder="Any Theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Theme</SelectItem>
                    {THEMES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort */}
              <div className="space-y-1.5">
                <Label htmlFor="sort" className="text-xs font-semibold">
                  Sort
                </Label>
                <Select
                  value={formData.sort || "DateDesc"}
                  onValueChange={(val) => handleSelectChange("sort", val)}
                >
                  <SelectTrigger id="sort" className="text-xs">
                    <SelectValue placeholder="Newest First" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORTS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date */}
              <div className="space-y-1.5">
                <Label htmlFor="startDate" className="text-xs font-semibold">
                  Start Date
                </Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  min={getMinAllowedDate()}
                  max={getTodayDate()}
                  value={formData.startDate || ""}
                  onChange={handleChange}
                  className="text-xs"
                />
                <p className="text-[9px] text-muted-foreground">
                  3-month window only
                </p>
              </div>

              {/* End Date */}
              <div className="space-y-1.5">
                <Label htmlFor="endDate" className="text-xs font-semibold">
                  End Date
                </Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  min={formData.startDate || getMinAllowedDate()}
                  max={getTodayDate()}
                  value={formData.endDate || ""}
                  onChange={handleChange}
                  className="text-xs"
                />
              </div>

              {/* Limit */}
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="limit" className="text-xs font-semibold">
                  Result Count
                </Label>
                <Select
                  value={formData.limit?.toString() || "50"}
                  onValueChange={(val) =>
                    handleSelectChange("limit", parseInt(val))
                  }
                >
                  <SelectTrigger id="limit" className="text-xs">
                    <SelectValue placeholder="50" />
                  </SelectTrigger>
                  <SelectContent>
                    {LIMIT_OPTIONS.map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n}
                        {n === GDELT_MAX_RECORDS ? " (max)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Domains — advanced */}
            <div className="space-y-1.5">
              <Label htmlFor="domains" className="text-xs font-semibold">
                Domains{" "}
                <span className="text-muted-foreground font-normal">
                  (advanced · auto-dropped first if over limit)
                </span>
              </Label>
              <Input
                id="domains"
                name="domains"
                placeholder="e.g. livemint.com,ndtv.com"
                value={formData.domains || ""}
                onChange={handleChange}
                className="text-xs"
              />
              {hasPaywalledDomain ? (
                <p className="text-[10px] text-yellow-600 flex items-center gap-1">
                  <Warning size={11} /> Paywalled domain → GDELT can&apos;t
                  crawl it → 0 results.
                </p>
              ) : (
                <p className="text-[9px] text-muted-foreground">
                  Avoid reuters.com, bloomberg.com (paywalled).
                </p>
              )}
              <div className="flex flex-wrap gap-1">
                {SUGGESTED_DOMAINS.slice(0, 6).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleCommaTagClick("domains", d)}
                    className="text-[9px] px-1.5 py-px rounded bg-secondary/30 border border-border hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {d.replace("economictimes.indiatimes.com", "ET.com")}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={
                isLoading ||
                !formData.keyword?.trim() ||
                isQueryTooLong ||
                hasPaywalledDomain
              }
              className="w-full"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Searching...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <MagnifyingGlass weight="bold" /> Search with Manual Filters
                </span>
              )}
            </Button>

            {isQueryTooLong && (
              <p className="text-[11px] text-destructive text-center">
                Query too long even after auto-trim — shorten your keywords.
              </p>
            )}
            {hasPaywalledDomain && !isQueryTooLong && (
              <p className="text-[11px] text-yellow-600 text-center">
                Remove the paywalled domain to enable search.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function hasWeekdayInRange(start: string, end: string): boolean {
  const cur = new Date(start);
  const e = new Date(end);
  while (cur <= e) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) return true;
    cur.setDate(cur.getDate() + 1);
  }
  return false;
}
