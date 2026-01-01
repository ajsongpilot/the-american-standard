import { NextResponse } from "next/server";
import { saveEdition, getLatestEdition, editionExists } from "@/lib/kv";
import type { Article, Edition, ArticleSection, MediaCheck, BiasVerdict } from "@/types/edition";
import { getTodayDateString } from "@/types/edition";

// Use Node.js runtime for longer timeout (Vercel Pro allows up to 300s)
export const runtime = "nodejs";
export const maxDuration = 300; // Allow up to 5 minutes for API calls

// Verify cron secret for security
const CRON_SECRET = process.env.CRON_SECRET;

interface GrokMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GrokResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface StoryTopic {
  title: string;
  description: string;
  section: string;
}

interface RawArticle {
  headline: string;
  subheadline?: string;
  leadParagraph: string;
  body: string;
  section: string;
  viralVideos?: Array<{
    platform: string;
    url: string;
    description: string;
    postedBy?: string;
  }>;
  relatedLinks?: Array<{
    title: string;
    url: string;
    source: string;
  }>;
}

interface RawMediaCheck {
  sourceName: string;
  sourceUrl: string;
  articleTitle: string;
  theirNarrative: string;
  whatTheyOmit: string;
  xReality: string;
  xQuotes: Array<{ handle: string; quote: string }>;
  verdict: string;
}

// Call Grok API with search enabled
async function callGrokWithSearch(
  messages: GrokMessage[],
  maxTokens: number = 2000,
  temperature: number = 0.5
): Promise<string> {
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    throw new Error("XAI_API_KEY is not configured");
  }

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-3-latest",
      messages,
      search_parameters: {
        mode: "on",
        sources: [
          { type: "x" },
          { type: "news" },
          { type: "web" },
        ],
        max_search_results: 20,
        return_citations: true,
      },
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Grok API error:", error);
    throw new Error(`Grok API error: ${response.status}`);
  }

  const data = (await response.json()) as GrokResponse;
  return data.choices[0]?.message?.content || "";
}

// PHASE 1: Get TRENDING stories from X
async function getTrendingStories(): Promise<StoryTopic[]> {
  console.log("Phase 1: Fetching TRENDING stories from X...");

  const response = await callGrokWithSearch(
    [
      {
        role: "user",
        content: `What are the top 12 trending US political stories on X/Twitter right now?

Search X and news. I want the ACTUAL stories people are talking about, especially:

1. FRAUD & SCANDALS - Minnesota Somali fraud, California budget fraud, any federal probes
2. TRUMP ADMINISTRATION - actions, controversies, statements
3. IMMIGRATION - ICE raids, deportations, sanctuary city battles  
4. VIRAL VIDEOS being shared - especially videos exposing fraud, corruption, or hypocrisy
5. FEDERAL INVESTIGATIONS - DOJ, FBI probes, indictments
6. STATE POLITICS getting national attention

IMPORTANT: Include the Minnesota/Somali fraud scandal if it's being discussed - this has been a MAJOR trending topic with billions in alleged fraud.

For each story give me:
1. Specific title (names, dollar amounts, locations)
2. One sentence on why it's trending
3. Section: "National Politics", "Washington Briefs", or "State & Local"

Output JSON only:
{"stories": [{"title": "Minnesota $9 Billion Somali Fraud Scandal", "description": "FBI and DOJ investigating massive welfare fraud", "section": "State & Local"}]}`,
      },
    ],
    3000,
    0.3
  );

  // Parse JSON
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("No JSON in trending response:", response.substring(0, 500));
    throw new Error("Failed to get trending stories");
  }

  const data = JSON.parse(jsonMatch[0]) as { stories: StoryTopic[] };
  console.log(`Found ${data.stories.length} trending stories`);
  return data.stories;
}

// PHASE 2: Write article for a single story
async function writeArticle(story: StoryTopic, isLead: boolean): Promise<RawArticle> {
  console.log(`Writing article: ${story.title}`);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const response = await callGrokWithSearch(
    [
      {
        role: "system",
        content: `You are a newspaper journalist for The American Standard ("Clear. Fair. American.").
Today's date is ${today}.

YOUR MISSION: Write about what's TRENDING on X - the stories Americans are actually talking about, not just what mainstream news is covering.

WRITING STYLE:
- Traditional newspaper voice, inverted pyramid structure
- Say "Americans" not "users on X" or "social media users"
- Quote real people by name or @handle to show what's being said on X
- Be specific: include names, dollar amounts, dates, locations
- Capture WHY this topic is trending - what's making people react

TONE:
- Neutral and factual in reporting
- Show how Americans are reacting and feeling
- Include direct quotes from real people on X who are driving the conversation`,
      },
      {
        role: "user",
        content: `Write a ${isLead ? "500" : "400"}-word newspaper article about this TRENDING topic: ${story.title}

Why it's trending: ${story.description}

This topic is trending on X right now. Write an article that:
1. Explains the story with key facts: who, what, when, where, specific numbers
2. Shows WHY Americans on X are talking about this - what's driving the conversation
3. Includes quotes from X posts (@handles) showing how people are reacting
4. Covers any new developments that sparked the trending discussion
5. Explains why this matters to everyday Americans

The article should feel relevant to TODAY even if the underlying story is ongoing.

Output as JSON only:
{
  "headline": "Traditional newspaper headline about the STORY (don't mention X in headline)",
  "subheadline": "Additional context or null",
  "leadParagraph": "80-100 words explaining the story",
  "body": "300-400 words with facts, X quotes with @handles, context. Use \\n\\n between paragraphs.",
  "section": "${story.section}",
  "viralVideos": [
    {
      "platform": "x or youtube",
      "url": "actual URL to the video",
      "description": "What the video shows",
      "postedBy": "@handle or channel"
    }
  ],
  "relatedLinks": [
    {
      "title": "Article headline",
      "url": "actual URL",
      "source": "Star Tribune, Fox News, etc."
    }
  ]
}

IMPORTANT: 
- Headlines should be traditional newspaper style - about the STORY, not about X
- Include viral VIDEOS being shared about this story (X videos, YouTube)
- Include related articles from other news sources`,
      },
    ],
    2500,
    0.5
  );

  // Parse JSON
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error(`No JSON for article "${story.title}":`, response.substring(0, 300));
    throw new Error(`Failed to generate article for: ${story.title}`);
  }

  return JSON.parse(jsonMatch[0]) as RawArticle;
}

// PHASE 3: Generate media bias check for an article
async function generateMediaWatch(headline: string, topic: string): Promise<MediaCheck[]> {
  console.log(`Generating media watch for: ${headline}`);

  const response = await callGrokWithSearch(
    [
      {
        role: "system",
        content: `You are a media bias analyst for The American Standard. Your job is to find mainstream media articles about a topic and fact-check them using X/Twitter as the source of truth.

YOUR TASK:
1. Search for news articles covering this story - YOU decide which outlets based on the story type
2. Find X posts from Americans calling out bias, omissions, or spin in that specific coverage
3. Compare the MSM narrative vs what regular people on X are actually saying

SOURCE SELECTION (Grok decides):
- State/local stories → local papers (Star Tribune, LA Times, Boston Globe, etc.)
- National politics → national outlets (CNN, NYT, WaPo, Politico, etc.)  
- Pick whoever is ACTUALLY being called out on X for their coverage

Be specific: find actual article URLs that exist, quote actual X users with @handles.`,
      },
      {
        role: "user",
        content: `Topic: ${headline}
${topic}

Search for mainstream media articles covering this story. YOU DECIDE which outlets to fact-check based on:
- For LOCAL stories (state scandals, city politics): Find local papers (Star Tribune, LA Times, Chicago Tribune, etc.)
- For NATIONAL stories: Find national outlets (CNN, NYT, WaPo, AP, etc.)
- Find whoever is ACTUALLY covering this story and getting called out on X

For each article you find (1-2 max):
1. Get the actual article URL and headline
2. What narrative/spin are they pushing?
3. What key facts do they omit, bury, or downplay?
4. Find X posts from Americans calling out their coverage
5. Verdict: "Misleading", "Missing Context", "Spin", "Omits Key Facts", "Narrative Push", or "Fair Coverage"

Output as JSON only:
{
  "mediaChecks": [
    {
      "sourceName": "Name of outlet",
      "sourceUrl": "https://actual-url-you-found.com/article",
      "articleTitle": "Their actual headline",
      "theirNarrative": "What spin they're pushing (1-2 sentences)",
      "whatTheyOmit": "Key facts they leave out or downplay",
      "xReality": "What Americans on X are actually saying about this coverage",
      "xQuotes": [
        {"handle": "@realhandle", "quote": "Their actual post calling out the coverage"}
      ],
      "verdict": "Misleading"
    }
  ]
}

If you can't find relevant MSM articles being criticized on X, return {"mediaChecks": []}`,
      },
    ],
    2000,
    0.4
  );

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log(`No media checks found for: ${headline}`);
      return [];
    }
    
    const data = JSON.parse(jsonMatch[0]) as { mediaChecks: RawMediaCheck[] };
    
    // Validate and transform
    const validVerdicts: BiasVerdict[] = [
      "Misleading", "Missing Context", "Spin", 
      "Omits Key Facts", "Narrative Push", "Fair Coverage"
    ];
    
    return data.mediaChecks
      .filter(check => check.sourceName && check.sourceUrl)
      .map(check => ({
        ...check,
        verdict: validVerdicts.includes(check.verdict as BiasVerdict) 
          ? (check.verdict as BiasVerdict) 
          : "Missing Context"
      }));
  } catch (err) {
    console.error(`Failed to parse media watch for: ${headline}`, err);
    return [];
  }
}

// Main generation function
async function generateArticles(): Promise<Article[]> {
  // PHASE 1: Get trending stories
  const stories = await getTrendingStories();

  // Limit to 8 stories to leave time for media watch (was 10)
  const storiesToWrite = stories.slice(0, 8);

  // PHASE 2: Write articles in parallel (batches of 3 to avoid rate limits)
  const articles: Article[] = [];
  const timestamp = new Date().toISOString();

  for (let i = 0; i < storiesToWrite.length; i += 3) {
    const batch = storiesToWrite.slice(i, i + 3);
    const batchPromises = batch.map((story, batchIndex) =>
      writeArticle(story, i === 0 && batchIndex === 0)
        .then((raw) => ({
          id: `article-${Date.now()}-${i + batchIndex}`,
          headline: raw.headline,
          subheadline: raw.subheadline || undefined,
          leadParagraph: raw.leadParagraph,
          body: raw.body,
          section: validateSection(raw.section),
          byline: "The American Standard Staff",
          publishedAt: timestamp,
          isLeadStory: i === 0 && batchIndex === 0,
          wordCount: countWords(raw.leadParagraph + " " + raw.body),
          storyTopic: story.description, // Keep for phase 3
          viralVideos: raw.viralVideos?.filter(v => v.url)?.map(v => ({
            platform: v.platform === "youtube" ? "youtube" : v.platform === "x" ? "x" : "other",
            url: v.url,
            description: v.description,
            postedBy: v.postedBy,
          })) as Article["viralVideos"],
          relatedLinks: raw.relatedLinks?.filter(l => l.url)?.map(l => ({
            title: l.title,
            url: l.url,
            source: l.source,
            stance: "neutral" as const,
          })) as Article["relatedLinks"],
        }))
        .catch((err) => {
          console.error(`Failed to write article for: ${story.title}`, err);
          return null;
        })
    );

    const batchResults = await Promise.all(batchPromises);
    articles.push(...(batchResults.filter(Boolean) as (Article & { storyTopic: string })[]));

    // Small delay between batches
    if (i + 3 < storiesToWrite.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  console.log(`Generated ${articles.length} articles, now adding media watch...`);

  // PHASE 3: Add media watch to top 4 articles (most important stories)
  // Run in parallel batches of 2 to save time
  const articlesToCheck = articles.slice(0, 4);
  
  for (let i = 0; i < articlesToCheck.length; i += 2) {
    const batch = articlesToCheck.slice(i, i + 2);
    const mediaWatchPromises = batch.map(async (article) => {
      const articleWithTopic = article as Article & { storyTopic?: string };
      const mediaWatch = await generateMediaWatch(
        article.headline,
        articleWithTopic.storyTopic || article.leadParagraph
      );
      article.mediaWatch = mediaWatch.length > 0 ? mediaWatch : undefined;
    });
    
    await Promise.all(mediaWatchPromises);
    
    if (i + 2 < articlesToCheck.length) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  // Clean up temporary storyTopic field
  const cleanedArticles = articles.map(({ ...article }) => {
    const { storyTopic, ...clean } = article as Article & { storyTopic?: string };
    return clean;
  });

  console.log(`Generated ${cleanedArticles.length} articles with media watch`);
  return cleanedArticles;
}

function validateSection(section: string): ArticleSection {
  const validSections: ArticleSection[] = [
    "National Politics",
    "Washington Briefs",
    "State & Local",
    "Opinion",
  ];
  return validSections.includes(section as ArticleSection)
    ? (section as ArticleSection)
    : "National Politics";
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export async function POST(request: Request) {
  // Verify the request is from Vercel Cron, has proper authorization, or is from the app itself
  const authHeader = request.headers.get("authorization");
  const cronSecret = request.headers.get("x-cron-secret");
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // Allow requests from the same origin (browser UI) or with valid auth
  const isSameOrigin =
    origin?.includes("localhost") ||
    referer?.includes("localhost") ||
    origin?.includes("vercel.app") ||
    referer?.includes("vercel.app") ||
    origin?.includes("the-american-standard");

  if (CRON_SECRET && !isSameOrigin) {
    if (cronSecret !== CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Check for force regenerate flag
  const url = new URL(request.url);
  const forceRegenerate = url.searchParams.get("force") === "true";

  const today = getTodayDateString();

  try {
    // Check if we already have today's edition (skip if force regenerate)
    if (!forceRegenerate) {
      const exists = await editionExists(today);
      if (exists) {
        return NextResponse.json({
          success: true,
          message: "Edition already exists for today",
          date: today,
        });
      }
    }

    // Generate new articles
    console.log(`Generating edition for ${today}...`);
    const articles = await generateArticles();

    if (articles.length === 0) {
      throw new Error("No articles were generated");
    }

    // Create the edition
    const edition: Edition = {
      date: today,
      publishedAt: new Date().toISOString(),
      articles,
      generatedAt: new Date().toISOString(),
      version: 1,
    };

    // Save to KV
    const saved = await saveEdition(edition);

    if (!saved) {
      throw new Error("Failed to save edition to KV");
    }

    return NextResponse.json({
      success: true,
      message: "Edition generated successfully",
      date: today,
      articleCount: articles.length,
    });
  } catch (error) {
    console.error("Error generating edition:", error);

    // Try to fallback to previous edition
    try {
      const latestEdition = await getLatestEdition();
      if (latestEdition) {
        return NextResponse.json(
          {
            success: false,
            error: "Generation failed, using previous edition",
            fallbackDate: latestEdition.date,
          },
          { status: 500 }
        );
      }
    } catch {
      // Ignore fallback errors
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET endpoint for manual triggers and health checks
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const authHeader = request.headers.get("authorization");

  // Allow health check without auth
  if (searchParams.get("health") === "true") {
    return NextResponse.json({ status: "ok" });
  }

  // For manual generation, require auth
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Redirect to POST handler
  return POST(request);
}
