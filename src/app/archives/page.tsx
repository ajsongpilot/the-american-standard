import Link from "next/link";
import { Masthead, Footer } from "@/components/newspaper";
import { getEditionsSummary } from "@/lib/kv";
import { formatEditionDate, getTodayDateString } from "@/types/edition";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export const metadata = {
  title: "Archives - The American Standard",
  description: "Browse past editions of The American Standard",
};

async function getArchives() {
  try {
    const summaries = await getEditionsSummary();
    return summaries;
  } catch (error) {
    console.log("Error fetching archives:", error);
    return [];
  }
}

export default async function ArchivesPage() {
  const today = getTodayDateString();
  const archives = await getArchives();

  // Group by month for better organization
  const archivesByMonth = archives.reduce(
    (acc, edition) => {
      const date = new Date(edition.date + "T12:00:00Z");
      const monthKey = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
      if (!acc[monthKey]) {
        acc[monthKey] = [];
      }
      acc[monthKey].push(edition);
      return acc;
    },
    {} as Record<string, typeof archives>
  );

  return (
    <div className="min-h-screen bg-background">
      <Masthead date={today} />

      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <div className="mb-8">
          <span className="inline-block w-12 h-1 bg-red mb-4" />
          <h1 className="font-headline text-4xl sm:text-5xl font-bold mb-2">
            Archives
          </h1>
          <p className="text-muted-foreground text-lg">
            Browse past editions of The American Standard
          </p>
        </div>

        <div className="rule-gray mb-8" />

        {Object.keys(archivesByMonth).length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              No archived editions available yet.
            </p>
            <Link href="/" className="news-link mt-4 inline-block">
              ← Return to today&apos;s edition
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(archivesByMonth).map(([month, editions]) => (
              <section key={month}>
                <h2 className="section-header">{month}</h2>

                <div className="space-y-4">
                  {editions.map((edition) => (
                    <Link
                      key={edition.date}
                      href={`/edition/${edition.date}`}
                      className="block group"
                    >
                      <article className="border-b border-rule pb-4 hover:bg-muted/30 transition-colors -mx-4 px-4 py-3 rounded">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <h3 className="font-headline text-xl font-semibold group-hover:text-navy transition-colors">
                              {formatEditionDate(edition.date)}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {edition.articleCount} articles
                            </p>
                          </div>
                          <span className="text-navy text-sm font-medium">
                            Read edition →
                          </span>
                        </div>
                        <p className="mt-2 text-foreground/80 line-clamp-2">
                          Lead story: {edition.leadHeadline}
                        </p>
                      </article>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <Link href="/" className="news-link">
            ← Return to today&apos;s edition
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
