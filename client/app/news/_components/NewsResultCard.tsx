// app/news/_components/NewsResultCard.tsx
"use client";

import { NewsArticle } from "../hooks/useSearchNews";
import { format } from "date-fns";
import { Globe, Clock, Subtitles } from "@phosphor-icons/react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface NewsResultCardProps {
  article: NewsArticle;
}

function parseGdeltDate(gdeltDate: string): Date {
  // GDELT compresses ISO dates: 20260330T023000Z → missing hyphens/colons
  const match = gdeltDate.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (match) {
    const [, yr, mo, da, hr, mi, se] = match;
    return new Date(`${yr}-${mo}-${da}T${hr}:${mi}:${se}Z`);
  }
  return new Date(gdeltDate); // Fallback
}

export function NewsResultCard({ article }: NewsResultCardProps) {
  const formattedDate = article.seenDate
    ? format(parseGdeltDate(article.seenDate), "MMM dd, yyyy • h:mm a")
    : "Unknown date";

  return (
    <Card className="flex flex-col h-full overflow-hidden hover:shadow-md transition-shadow duration-200 border-border bg-card">
      {article.socialImage ? (
        <div className="h-48 w-full overflow-hidden bg-muted">
          <img
            src={article.socialImage}
            alt={article.title}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.classList.add('flex', 'items-center', 'justify-center');
              (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-muted-foreground text-sm">No Image</span>';
            }}
          />
        </div>
      ) : (
        <div className="h-8 bg-gradient-to-r from-muted/50 to-muted/20" />
      )}
      
      <CardHeader className="p-4 pb-2 flex-grow">
        <div className="flex flex-wrap gap-2 mb-2">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 uppercase tracking-wider font-semibold">
            {article.domain}
          </Badge>
          {article.sourceCountry && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 uppercase text-muted-foreground">
              {article.sourceCountry}
            </Badge>
          )}
        </div>
        <a 
          href={article.url} 
          target="_blank" 
          rel="noreferrer noopener"
          className="hover:underline underline-offset-2"
        >
          <h3 className="text-base font-bold leading-tight line-clamp-3 text-foreground" dangerouslySetInnerHTML={{ __html: article.title }} />
        </a>
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        <div className="flex items-center text-xs text-muted-foreground gap-1.5 mt-2">
          <Clock size={14} />
          <span>{formattedDate}</span>
        </div>
        {article.language && article.language.toLowerCase() !== "english" && (
          <div className="flex items-center text-xs text-muted-foreground gap-1.5 mt-1">
            <Subtitles size={14} />
            <span>{article.language}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
