import type { Article } from "@/types/edition";
import Link from "next/link";
import Image from "next/image";

interface ArticleCardProps {
  article: Article;
  editionDate: string;
  showImage?: boolean;
  size?: "small" | "medium" | "large";
}

export function ArticleCard({
  article,
  editionDate,
  showImage = true,
  size = "medium",
}: ArticleCardProps) {
  const headlineSize = {
    small: "text-lg sm:text-xl",
    medium: "text-xl sm:text-2xl",
    large: "text-2xl sm:text-3xl",
  }[size];

  return (
    <article className="group">
      {/* Image */}
      {showImage && article.imageUrl && (
        <Link href={`/edition/${editionDate}/${article.id}`}>
          <div className="relative aspect-[16/10] overflow-hidden bg-muted mb-3">
            <Image
              src={article.imageUrl}
              alt={article.imageCaption || article.headline}
              fill
              className="object-cover grayscale-subtle group-hover:grayscale-0 transition-all duration-300"
            />
          </div>
        </Link>
      )}

      {/* Headline */}
      <Link href={`/edition/${editionDate}/${article.id}`}>
        <h3
          className={`font-headline ${headlineSize} font-bold leading-snug mb-2 group-hover:text-navy transition-colors`}
        >
          {article.headline}
        </h3>
      </Link>

      {/* Byline */}
      <p className="byline mb-2 text-xs">
        By {article.byline}
      </p>

      {/* Lead paragraph preview */}
      <p className="text-base text-foreground/80 leading-relaxed line-clamp-3 article-text">
        {article.leadParagraph}
      </p>

      {/* Read more link */}
      <Link
        href={`/edition/${editionDate}/${article.id}`}
        className="news-link text-sm font-medium text-navy inline-block mt-2"
      >
        Read more →
      </Link>
    </article>
  );
}
