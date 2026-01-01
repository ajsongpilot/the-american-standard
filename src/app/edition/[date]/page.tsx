import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Masthead, LeadStory, EditionGrid, Footer } from "@/components/newspaper";
import { getEdition } from "@/lib/kv";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const runtime = "edge";

interface EditionPageProps {
  params: Promise<{
    date: string;
  }>;
}

export async function generateMetadata({ params }: EditionPageProps) {
  const { date } = await params;
  return {
    title: `Edition ${date} - The American Standard`,
    description: `Read The American Standard edition from ${date}`,
  };
}

async function getEditionByDate(date: string) {
  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return null;
  }

  try {
    const edition = await getEdition(date);
    if (edition) {
      return edition;
    }
  } catch (error) {
    console.log("Error fetching edition:", error);
  }

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

async function EditionContent({ date }: { date: string }) {
  const edition = await getEditionByDate(date);

  if (!edition) {
    notFound();
  }

  const leadStory = edition.articles.find((a) => a.isLeadStory);
  const otherArticles = edition.articles.filter((a) => !a.isLeadStory);

  return (
    <>
      <Masthead date={edition.date} />

      <main className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        {/* Archive notice */}
        <div className="mb-6 text-center">
          <Link href="/archives" className="news-link text-sm">
            ← Back to Archives
          </Link>
        </div>

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

export default async function EditionPage({ params }: EditionPageProps) {
  const { date } = await params;
  
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<LoadingSkeleton />}>
        <EditionContent date={date} />
      </Suspense>
    </div>
  );
}
