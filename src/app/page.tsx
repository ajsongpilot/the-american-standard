import { Suspense } from "react";
import { Masthead, LeadStory, EditionGrid, Footer } from "@/components/newspaper";
import { getTodayEdition } from "@/lib/kv";
import { Skeleton } from "@/components/ui/skeleton";
import { GenerateButton } from "@/components/GenerateButton";
import type { Edition } from "@/types/edition";

export const dynamic = "force-dynamic";
export const runtime = "edge";

async function getEdition(): Promise<Edition | null> {
  // Try to get today's edition from KV
  try {
    const edition = await getTodayEdition();
    if (edition) {
      return edition;
    }
  } catch (error) {
    console.log("Error fetching edition:", error);
  }
  
  // No edition available - return null instead of sample data
  return null;
}

function LoadingSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Skeleton className="h-12 w-3/4 mb-4" />
      <Skeleton className="h-6 w-1/2 mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Skeleton className="h-64" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}

async function EditionContent() {
  const edition = await getEdition();
  
  // No edition available - show generate prompt
  if (!edition) {
    return (
      <>
        <Masthead date={new Date().toISOString().split("T")[0]} />
        <main className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
          <div className="text-center py-16 border-2 border-dashed border-border rounded-lg">
            <h2 className="text-2xl font-serif font-bold mb-4">No Edition Available</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Today&apos;s edition hasn&apos;t been generated yet. Generate fresh content from real-time news.
            </p>
            <GenerateButton />
          </div>
        </main>
        <Footer />
      </>
    );
  }
  
  // Separate lead story from other articles
  const leadStory = edition.articles.find((a) => a.isLeadStory);
  const otherArticles = edition.articles.filter((a) => !a.isLeadStory);

  return (
    <>
      <Masthead date={edition.date} />

      <main className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        {/* Lead Story */}
        {leadStory && (
          <LeadStory article={leadStory} editionDate={edition.date} />
        )}

        {/* Remaining articles organized by section */}
        <EditionGrid articles={otherArticles} editionDate={edition.date} />
      </main>

      <Footer />
    </>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<LoadingSkeleton />}>
        <EditionContent />
      </Suspense>
    </div>
  );
}
