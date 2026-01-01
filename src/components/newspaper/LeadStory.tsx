import type { Article } from "@/types/edition";
import Link from "next/link";
import Image from "next/image";

interface LeadStoryProps {
  article: Article;
  editionDate: string;
}

export function LeadStory({ article, editionDate }: LeadStoryProps) {
  return (
    <article className="mb-8 sm:mb-12">
      {/* Lead story headline with red accent */}
      <div className="mb-4">
        <span className="inline-block w-12 h-1 bg-red mb-4" />
        <Link href={`/edition/${editionDate}/${article.id}`}>
          <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight hover:text-navy transition-colors cursor-pointer">
            {article.headline}
          </h2>
        </Link>
        {article.subheadline && (
          <p className="font-headline text-xl sm:text-2xl text-muted-foreground mt-2 font-normal">
            {article.subheadline}
          </p>
        )}
      </div>

      {/* Byline */}
      <p className="byline mb-4">
        By {article.byline} •{" "}
        {new Date(article.publishedAt).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Featured image */}
        {article.imageUrl && (
          <div className="order-1 lg:order-2">
            <div className="relative aspect-[4/3] overflow-hidden bg-muted">
              <Image
                src={article.imageUrl}
                alt={article.imageCaption || article.headline}
                fill
                className="object-cover grayscale-subtle"
                priority
              />
            </div>
            {article.imageCaption && (
              <p className="text-sm text-muted-foreground mt-2 italic">
                {article.imageCaption}
              </p>
            )}
          </div>
        )}

        {/* Lead paragraph and body preview */}
        <div className={`order-2 lg:order-1 ${!article.imageUrl ? "lg:col-span-2" : ""}`}>
          <p className="drop-cap text-lg sm:text-xl leading-relaxed article-text mb-4">
            {article.leadParagraph}
          </p>
          <div className="article-text prose prose-lg prose-newspaper max-w-none">
            {article.body.split("\n\n").slice(0, 2).map((paragraph, idx) => (
              <p key={idx} className="mb-4">
                {paragraph}
              </p>
            ))}
          </div>
          <Link 
            href={`/edition/${editionDate}/${article.id}`}
            className="news-link font-medium text-navy inline-flex items-center gap-1 mt-4"
          >
            Continue reading →
          </Link>
        </div>
      </div>

      {/* Bottom rule */}
      <div className="rule-gray mt-8" />
    </article>
  );
}
