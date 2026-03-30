// app/news/_components/NewsResultsList.tsx
"use client";

import { NewsArticle, SearchNewsResponse } from "../hooks/useSearchNews";
import { NewsResultCard } from "./NewsResultCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, WarningCircle } from "@phosphor-icons/react";

interface NewsResultsListProps {
  data: SearchNewsResponse | undefined;
  isLoading: boolean;
  error: Error | null;
  onPageChange: (newPage: number) => void;
  currentPage: number;
}

export function NewsResultsList({ data, isLoading, error, onPageChange, currentPage }: NewsResultsListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 min-h-[400px]">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-muted-foreground text-sm tracking-widest uppercase">Fetching Articles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border border-destructive/20 bg-destructive/5 rounded-xl">
        <WarningCircle size={40} className="text-destructive mb-3" />
        <h3 className="text-lg font-semibold text-destructive">Error Fetching News</h3>
        <p className="text-sm text-destructive/80 text-center max-w-md mt-1">
          {error.message || "An unexpected error occurred while communicating with the API."}
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-card border border-dashed border-border rounded-xl">
        <p className="text-muted-foreground">Enter a keyword and click search to see results.</p>
      </div>
    );
  }

  if (data.articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 bg-muted/30 border border-border rounded-xl">
        <h3 className="text-xl font-medium tracking-tight">No results</h3>
        <p className="text-muted-foreground text-sm mt-2 text-center">
          We couldn't find any articles matching your search criteria in the past 3 months.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.articles.map((article, index) => (
          <NewsResultCard key={`${article.url}-${index}`} article={article} />
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4 mt-8">
        <div className="text-sm text-muted-foreground">
          Showing page <span className="font-semibold text-foreground">{data.pagination.page}</span> of{" "}
          <span className="font-semibold text-foreground">{data.pagination.totalPages}</span>
          {" "}({data.pagination.total} total results)
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!data.pagination.hasPrevPage}
          >
            <ArrowLeft weight="bold" className="mr-2" /> Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!data.pagination.hasNextPage}
          >
            Next <ArrowRight weight="bold" className="ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
