export type ArticleSection =
  | "National Politics"
  | "Washington Briefs"
  | "State & Local"
  | "Opinion";

export type BiasVerdict = 
  | "Misleading"
  | "Missing Context" 
  | "Spin"
  | "Omits Key Facts"
  | "Narrative Push"
  | "Fair Coverage";

export interface MediaCheck {
  sourceName: string;        // "Star Tribune", "CNN", "NYT"
  sourceUrl: string;         // Link to their article
  articleTitle: string;      // Their headline
  theirNarrative: string;    // What they're pushing (1-2 sentences)
  whatTheyOmit: string;      // Key facts they leave out
  xReality: string;          // What X users are actually saying
  xQuotes: Array<{
    handle: string;
    quote: string;
  }>;
  verdict: BiasVerdict;
}

export interface ViralVideo {
  platform: "x" | "youtube" | "other";
  url: string;
  description: string;
  postedBy?: string;  // @handle or channel name
  thumbnailUrl?: string;  // Preview image
}


export interface XReaction {
  handle: string;       // @username
  displayName?: string; // "Nick Sortor"
  quote: string;        // The actual post content
  url?: string;         // Link to the post
  likes?: string;       // "12.5K"
  reposts?: string;     // "3.2K"
  verified?: boolean;   // Blue check
}

export interface RelatedLink {
  title: string;
  url: string;
  source: string;  // "Star Tribune", "Fox News", etc.
  stance?: "mainstream" | "critical" | "neutral";
}

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
  mediaWatch?: MediaCheck[];  // Bias checks on other outlets
  viralVideos?: ViralVideo[];  // Videos being shared about this story
  relatedLinks?: RelatedLink[];  // Related coverage from other sources
  xReactions?: XReaction[];  // X posts reacting to the story
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
