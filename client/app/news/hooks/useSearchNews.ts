// app/news/hooks/useSearchNews.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface SearchNewsParams {
  keyword: string;
  countries?: string;
  domains?: string;
  languages?: string;
  theme?: string;
  startDate?: string;
  endDate?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface NewsArticle {
  url: string;
  urlMobile?: string;
  title: string;
  seenDate: string;
  socialImage?: string;
  domain: string;
  language?: string;
  sourceCountry?: string;
}

export interface SearchNewsResponse {
  articles: NewsArticle[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  gdeltQueryUrl: string;
}

/**
 * Strip params that are empty strings, null, or undefined before sending
 * to the backend. NestJS @IsISO8601() rejects empty string for date fields.
 */
function cleanParams(params: SearchNewsParams): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== "" && v !== null && v !== undefined,
    ),
  );
}

async function fetchNews(
  params: SearchNewsParams,
): Promise<SearchNewsResponse> {
  const { data } = await api.get<SearchNewsResponse>("/news/search", {
    params: cleanParams(params),
  });
  return data;
}

export function useSearchNews(
  params: SearchNewsParams,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: ["news", "search", params],
    queryFn: () => fetchNews(params),
    enabled: enabled && !!params.keyword,
    staleTime: 60_000,
  });
}
