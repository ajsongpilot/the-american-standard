import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Masthead, Footer } from "@/components/newspaper";
import { MediaWatch } from "@/components/MediaWatch";
import { ViralContent } from "@/components/ViralContent";
import { XReactions } from "@/components/XReactions";
import { getEdition } from "@/lib/kv";
import { formatEditionDate } from "@/types/edition";

export const dynamic = "force-dynamic";
export const runtime = "edge";

interface ArticlePageProps {
  params: Promise<{
    date: string;
    articleId: string;
  }>;
}

export async function generateMetadata({ params }: ArticlePageProps) {
  const { date, articleId } = await params;
  
  // Try to get the article for metadata
  let edition;
  try {
    edition = await getEdition(date);
  } catch {
    // No edition available
  }

  const article = edition?.articles.find((a) => a.id === articleId);

  if (!article) {
    return {
      title: "Article Not Found - The American Standard",
    };
  }

  return {
    title: `${article.headline} - The American Standard`,
    description: article.leadParagraph,
    openGraph: {
      title: article.headline,
      description: article.leadParagraph,
      type: "article",
      publishedTime: article.publishedAt,
      authors: [article.byline],
    },
  };
}

async function getArticle(date: string, articleId: string) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return null;
  }

  let edition;
  try {
    edition = await getEdition(date);
  } catch (error) {
    console.log("Error fetching edition:", error);
  }

  if (!edition) {
    return null;
  }

  const article = edition.articles.find((a) => a.id === articleId);
  return article ? { article, edition } : null;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { date, articleId } = await params;
  const result = await getArticle(date, articleId);

  if (!result) {
    notFound();
  }

  const { article, edition } = result;
  const formattedDate = formatEditionDate(edition.date);

  return (
    <div className="min-h-screen bg-background">
      <Masthead date={edition.date} />

      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        {/* Navigation */}
        <nav className="mb-8">
          <Link href={`/edition/${date}`} className="news-link text-sm">
            ← Back to {formattedDate} Edition
          </Link>
        </nav>

        {/* Article */}
        <article className="prose prose-lg prose-newspaper max-w-none">
          {/* Section label */}
          <p className="section-header not-prose">{article.section}</p>

          {/* Headline */}
          <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-4 not-prose">
            {article.headline}
          </h1>

          {/* Subheadline */}
          {article.subheadline && (
            <p className="font-headline text-xl sm:text-2xl text-muted-foreground font-normal mb-6 not-prose">
              {article.subheadline}
            </p>
          )}

          {/* Byline and date */}
          <div className="byline mb-8 not-prose border-b border-rule pb-4">
            <p className="text-foreground font-medium">By {article.byline}</p>
            <p className="text-muted-foreground text-sm mt-1">
              Published{" "}
              {new Date(article.publishedAt).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          {/* Featured image */}
          {article.imageUrl && (
            <figure className="not-prose mb-8">
              <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                <Image
                  src={article.imageUrl}
                  alt={article.imageCaption || article.headline}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              {article.imageCaption && (
                <figcaption className="text-sm text-muted-foreground mt-2 italic text-center">
                  {article.imageCaption}
                </figcaption>
              )}
            </figure>
          )}

          {/* Lead paragraph with drop cap */}
          <p className="drop-cap text-xl leading-relaxed article-text">
            {article.leadParagraph}
          </p>

          {/* Featured Image with credit */}
          {article.featuredImage && (
            <FeaturedImage image={article.featuredImage} />
          )}

          {/* Article body */}
          <div className="article-text mt-6 space-y-5">
            {article.body.split("\n\n").map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>

          {/* X Reactions - What Americans are saying */}
          {article.xReactions && article.xReactions.length > 0 && (
            <div className="not-prose">
              <XReactions reactions={article.xReactions} />
            </div>
          )}

          {/* Viral Videos */}
          {article.viralVideos && article.viralVideos.length > 0 && (
            <div className="not-prose">
              <ViralContent videos={article.viralVideos} />
            </div>
          )}

          {/* Media Watch - Fact-checking other outlets */}
          {article.mediaWatch && article.mediaWatch.length > 0 && (
            <div className="not-prose">
              <MediaWatch checks={article.mediaWatch} />
            </div>
          )}

          {/* Footer info */}
          <div className="not-prose mt-12 pt-6 border-t border-rule">
            <p className="text-sm text-muted-foreground italic text-center">
              This article was written by {article.byline}.
            </p>
          </div>
        </article>

        {/* More from this edition */}
        <div className="mt-12">
          <h2 className="section-header">More from This Edition</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {edition.articles
              .filter((a) => a.id !== article.id)
              .slice(0, 4)
              .map((otherArticle) => (
                <Link
                  key={otherArticle.id}
                  href={`/edition/${date}/${otherArticle.id}`}
                  className="group block p-4 border border-rule rounded hover:bg-muted/30 transition-colors"
                >
                  <p className="text-xs text-red uppercase tracking-wide mb-1">
                    {otherArticle.section}
                  </p>
                  <h3 className="font-headline font-semibold group-hover:text-navy transition-colors line-clamp-2">
                    {otherArticle.headline}
                  </h3>
                </Link>
              ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
