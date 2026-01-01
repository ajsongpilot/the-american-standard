import type { Article, ArticleSection } from "@/types/edition";
import { ArticleCard } from "./ArticleCard";
import { SectionHeader } from "./SectionHeader";

interface EditionGridProps {
  articles: Article[];
  editionDate: string;
}

const SECTION_ORDER: ArticleSection[] = [
  "National Politics",
  "Washington Briefs",
  "The States",
  "Culture",
  "Opinion",
];

export function EditionGrid({ articles, editionDate }: EditionGridProps) {
  // Group articles by section
  const articlesBySection = articles.reduce(
    (acc, article) => {
      if (!acc[article.section]) {
        acc[article.section] = [];
      }
      acc[article.section].push(article);
      return acc;
    },
    {} as Record<ArticleSection, Article[]>
  );

  return (
    <div className="space-y-10 sm:space-y-12">
      {SECTION_ORDER.map((section) => {
        const sectionArticles = articlesBySection[section];
        if (!sectionArticles || sectionArticles.length === 0) {
          return null;
        }

        return (
          <section key={section}>
            <SectionHeader section={section} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {sectionArticles.map((article, idx) => (
                <div
                  key={article.id}
                  className={idx === 0 && sectionArticles.length > 2 ? "md:col-span-2 lg:col-span-1" : ""}
                >
                  <ArticleCard
                    article={article}
                    editionDate={editionDate}
                    showImage={idx < 3}
                    size={idx === 0 ? "large" : "medium"}
                  />
                </div>
              ))}
            </div>

            {/* Section divider */}
            <div className="rule-gray mt-8" />
          </section>
        );
      })}
    </div>
  );
}
