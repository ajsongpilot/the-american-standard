export type ArticleSection =
  | "National Politics"
  | "Washington Briefs"
  | "State & Local"
  | "Opinion";

export interface Article {
  id: string;
  headline: string;
  subheadline?: string;
  leadParagraph: string;
  body: string;
  section: ArticleSection;
  byline: string;
  imageUrl?: string;
  imageCaption?: string;
  publishedAt: string;
  isLeadStory: boolean;
  wordCount: number;
}

export interface Edition {
  date: string; // YYYY-MM-DD format
  publishedAt: string; // ISO timestamp
  articles: Article[];
  generatedAt: string; // ISO timestamp
  version: number;
}

export interface EditionSummary {
  date: string;
  articleCount: number;
  leadHeadline: string;
}

export function formatEditionDate(dateString: string): string {
  const date = new Date(dateString + "T12:00:00Z");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

export function getEditionKey(date: string): string {
  return `edition:${date}`;
}
