// app/news/_components/NewsContainer.tsx
"use client";

import { useState } from "react";
import { NewsSearchForm } from "./NewsSearchForm";
import { NewsResultsList } from "./NewsResultsList";
import { SearchNewsParams, useSearchNews } from "../hooks/useSearchNews";

export function NewsContainer() {
  const [formData, setFormData] = useState<Partial<SearchNewsParams>>({
    theme: "",
    sort: "DateDesc",
    limit: 50,
  });

  const [activeParams, setActiveParams] = useState<SearchNewsParams | null>(
    null,
  );

  const { data, isLoading, error } = useSearchNews(
    activeParams as SearchNewsParams,
    !!activeParams,
  );

  /** Called from the manual search form submit */
  const handleSearch = () => {
    if (!formData.keyword) return;
    setActiveParams({ ...(formData as SearchNewsParams), page: 1 });
  };

  /**
   * Called directly by preset cards — bypasses the form entirely.
   * Presets carry their own complete, validated params.
   */
  const handlePresetSearch = (params: SearchNewsParams) => {
    setFormData(params); // sync form so manual section shows preset values
    setActiveParams({ ...params, page: 1 }); // trigger query immediately
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePageChange = (newPage: number) => {
    setActiveParams((prev) => (prev ? { ...prev, page: newPage } : null));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
      {/* Sidebar */}
      <div className="w-full lg:w-96 flex-shrink-0 lg:sticky top-[100px]">
        <NewsSearchForm
          formData={formData}
          setFormData={setFormData}
          onSearch={handleSearch}
          onPresetSearch={handlePresetSearch}
          isLoading={isLoading}
        />
      </div>

      {/* Results */}
      <div className="flex-1 min-w-0 w-full">
        <div className="mb-6 flex flex-col gap-1 border-b border-border pb-4">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Global News Explorer
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Search up-to-the-minute global news coverage using the GDELT 2.0
            API. Filter by themes, domains, and languages to find exactly what
            you&apos;re looking for.
          </p>
        </div>

        <NewsResultsList
          data={data}
          isLoading={isLoading}
          error={error}
          onPageChange={handlePageChange}
          currentPage={activeParams?.page || 1}
        />
      </div>
    </div>
  );
}
