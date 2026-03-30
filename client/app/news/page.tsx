import { Metadata } from "next";
import { NewsContainer } from "./_components/NewsContainer";

export const metadata: Metadata = {
  title: "News Explorer | vaulit",
  description: "Advanced global news search powered by GDELT API.",
};

export default function NewsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-[1400px]">
        <NewsContainer />
      </div>
    </main>
  );
}
