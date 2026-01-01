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
  whatItMeansForYou?: string;
  section: string;
  viralVideos?: Array<{
    platform: string;
    url: string;
    description: string;
    postedBy?: string;
  }>;
  xReactions?: Array<{
    handle: string;
    displayName?: string;
    quote: string;
    url?: string;
    likes?: string;
    reposts?: string;
    verified?: boolean;
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
        max_search_results: 40,
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
        content: `What are the top 25-30 stories Americans are talking about on X right now?

Search X/Twitter for what's ACTUALLY trending. Give me stories across these sections:

NATIONAL POLITICS (6-8 stories):
- Trump administration actions and decisions
- Federal policy - immigration, economy, trade
- Major political figures and controversies

WASHINGTON BRIEFS (5-6 stories):
- Congress, legislation, hearings, votes
- DOJ, FBI, federal agency actions
- Government scandals, investigations

THE STATES (4-5 stories):
- Governors making national news
- State laws, court cases, scandals
- Regional stories getting attention

GEOPOLITICS (4-5 stories):
- US foreign policy affecting Americans
- Trade wars, tariffs, sanctions
- Military actions, international conflicts
- Immigration from specific countries
- Anything abroad that impacts American jobs, prices, or security

CULTURE (6-8 stories):
- Hot debates on X (tech workers vs H1B, etc.)
- Viral moments, videos blowing up
- Public figures clashing
- Culture war topics people are arguing about
- GENERATIONAL ISSUES: Economic realities facing Boomers, Gen X, Millennials, Gen Z
  * Social Security/Medicare sustainability
  * Housing affordability across generations
  * Job market access, wages, career mobility
  * Student debt, cost of living comparisons
  * Wealth distribution by age
  * Frame as "different priorities" not generational blame

RULES:
- Max 2-3 articles on any single news event
- Include PEOPLE - names, handles, personalities
- Focus on what impacts AMERICANS

For each story:
1. Specific title with names, numbers, details
2. One sentence on why it's trending
3. Section: "National Politics", "Washington Briefs", "The States", "Geopolitics", or "Culture"

Output JSON only:
{"stories": [{"title": "...", "description": "...", "section": "..."}]}`,
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
        content: `You are a journalist for The American Standard - a populist newspaper that serves THE AMERICAN PEOPLE.
Today's date is ${today}.

OUR MISSION: American news FOR Americans. We hold the government ACCOUNTABLE to the people who pay their salaries.

CRITICAL RULES:
1. NEVER FABRICATE QUOTES - Do NOT make up quotes from fictional people ("Maria Gonzalez, a diner owner, told The American Standard..."). We have no reporters. Only use:
   - Real quotes from X posts (with @handles)
   - Official statements from named officials
   - Data from cited reports
2. ACTIONS over PR - What did they DO, not what they said/tweeted
3. ACCOUNTABILITY - Name names. Who failed? Who's responsible?
4. IMPACT - Every story must explain why Americans should care
5. GENERATIONAL TOPICS - When covering Boomers, Gen X, Millennials, Gen Z:
   - Use generation names - they're real, don't sanitize them
   - Present ECONOMIC REALITIES with DATA (housing costs, wages, debt, benefits)
   - Explain WHY there's tension without writing hit pieces on any generation
   - A Boomer should be able to read it and understand the frustration without feeling attacked
   - Focus on POLICY failures and SYSTEMS, not blaming individuals

BAD (fabricated): "John Smith, a construction worker in Texas, told The American Standard..."
GOOD (real): "According to Bureau of Labor Statistics data..." or "@realworker posted on X: '...'"`,
      },
      {
        role: "user",
        content: `Write a ${isLead ? "500" : "400"}-word article about: ${story.title}

Context: ${story.description}

STRUCTURE:
1. leadParagraph: The key facts (who, what, when, specific numbers)
2. body: Details, context, government actions/failures. NO FAKE QUOTES.
3. whatItMeansForYou: 2-3 sentences explaining the direct impact on everyday Americans (taxes, jobs, prices, safety, rights)

DO NOT fabricate quotes from fictional people. Only use real X posts or official statements.

Output as JSON only:
{
  "headline": "Clear, specific headline",
  "subheadline": "Additional context or null",
  "leadParagraph": "80-100 words - the key facts",
  "body": "250-350 words. Use \\n\\n between paragraphs. NO FABRICATED QUOTES.",
  "whatItMeansForYou": "2-3 sentences: How does this affect YOU as an American? Your wallet, your job, your family, your rights?",
  "section": "${story.section}",
  "viralVideos": [
    {
      "platform": "x",
      "url": "https://x.com/user/status/123",
      "description": "What the video shows",
      "postedBy": "@handle"
    }
  ],
  "xReactions": [
    {
      "handle": "@realusername",
      "displayName": "Real Display Name",
      "quote": "Their actual post content from X",
      "url": "https://x.com/username/status/123456789",
      "verified": true,
      "likes": "12.5K",
      "reposts": "3.2K"
    }
  ]
}

Find 3-5 REAL X posts about this story. These must be actual posts you found, not fabricated.`,
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

Search for mainstream media articles covering this story and FACT-CHECK THEM.

Find 3-4 different outlets covering this story:
- Mix of local AND national outlets when relevant
- Include whoever is being called out on X for their coverage
- Look for: CNN, NYT, WaPo, AP, Star Tribune, local papers, Politico, etc.

For EACH outlet (find 3-4):
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

Find at least 3 outlets to fact-check. If you can't find any, return {"mediaChecks": []}`,
      },
    ],
    3000,
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

  // Write up to 30 stories for comprehensive coverage
  const storiesToWrite = stories.slice(0, 30);

  // PHASE 2: Write articles in parallel (batches of 5 to balance speed and rate limits)
  const articles: Article[] = [];
  const timestamp = new Date().toISOString();

  for (let i = 0; i < storiesToWrite.length; i += 5) {
    const batch = storiesToWrite.slice(i, i + 5);
    const batchPromises = batch.map((story, batchIndex) =>
      writeArticle(story, i === 0 && batchIndex === 0)
        .then((raw) => ({
          id: `article-${Date.now()}-${i + batchIndex}`,
          headline: raw.headline,
          subheadline: raw.subheadline || undefined,
          leadParagraph: raw.leadParagraph,
          body: raw.body,
          whatItMeansForYou: raw.whatItMeansForYou || undefined,
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
          xReactions: raw.xReactions?.filter(r => r.handle && r.quote)?.map(r => ({
            handle: r.handle.startsWith("@") ? r.handle : `@${r.handle}`,
            displayName: r.displayName,
            quote: r.quote,
            url: r.url,
            likes: r.likes,
            reposts: r.reposts,
            verified: r.verified,
          })) as Article["xReactions"],
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

  // PHASE 3: Add media watch to top 3 articles (most important stories)
  // Run in parallel batches of 3 to save time
  const articlesToCheck = articles.slice(0, 3);
  
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
  // Map legacy/alternate names
  const sectionMap: Record<string, ArticleSection> = {
    "State & Local": "The States",
    "States": "The States",
    "Local": "The States",
    "Foreign Policy": "Geopolitics",
    "International": "Geopolitics",
    "World": "Geopolitics",
  };
  
  const mapped = sectionMap[section] || section;
  
  const validSections: ArticleSection[] = [
    "National Politics",
    "Washington Briefs",
    "The States",
    "Geopolitics",
    "Culture",
    "Opinion",
  ];
  return validSections.includes(mapped as ArticleSection)
    ? (mapped as ArticleSection)
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error generating edition:", errorMessage, errorStack);

    // Try to fallback to previous edition
    try {
      const latestEdition = await getLatestEdition();
      if (latestEdition) {
        return NextResponse.json(
          {
            success: false,
            error: "Generation failed, using previous edition",
            fallbackDate: latestEdition.date,
            debugError: errorMessage, // Include actual error for debugging
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
        error: errorMessage,
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
    return NextResponse.json({ 
      status: "ok",
      hasXaiKey: !!process.env.XAI_API_KEY,
      hasCronSecret: !!process.env.CRON_SECRET,
      hasRedisUrl: !!process.env.REDIS_URL || !!process.env.KV_REST_API_URL,
    });
  }

  // For manual generation, require auth
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Redirect to POST handler
  return POST(request);
}
