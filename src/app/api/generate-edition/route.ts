import { NextResponse } from "next/server";
import { saveEdition, getLatestEdition, editionExists } from "@/lib/kv";
import type { Article, Edition, ArticleSection } from "@/types/edition";
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

interface RawArticle {
  headline: string;
  subheadline?: string;
  leadParagraph: string;
  body: string;
  section: string;
}

async function callGrokAPI(messages: GrokMessage[]): Promise<string> {
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
      // Use search_parameters for Live Search (web, news, X)
      search_parameters: {
        mode: "on", // Force search to be used
        sources: [
          { type: "x", post_view_count: 5000 },  // X posts with 5K+ views (viral content)
          { type: "x" },       // General X search
          { type: "news" },    // News sources
        ],
        max_search_results: 40, // More sources for better trending coverage
        return_citations: true,
      },
      temperature: 0.7, // Higher for more variety in story selection
      max_tokens: 12000, // More tokens for 8-10 detailed articles
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Grok API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as GrokResponse;
  return data.choices[0]?.message?.content || "";
}

async function generateArticles(): Promise<Article[]> {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const systemPrompt = `You are a newspaper editor for "The American Standard" with the tagline "Clear. Fair. American."

YOUR PRIMARY JOB: Find what's ACTUALLY TRENDING and VIRAL on X/Twitter right now, then write newspaper articles about those topics.

DO NOT write generic news summaries. Instead:
1. Search X for what people are ACTUALLY talking about RIGHT NOW
2. Look at trending topics, viral posts, hashtags with high engagement
3. Find the stories with 10K, 50K, 100K+ posts
4. Include controversial topics that are generating debate
5. Cover scandals, fraud investigations, political drama, viral moments

Write like a traditional newspaper but cover what's TRENDING, not just what's "newsworthy" in a traditional sense. If people on X are talking about something, we should cover it.

Style: Traditional newspaper voice, politically neutral, factual, inverted pyramid structure.
Article length: 300-450 words each with specific names, numbers, quotes, and details.

Sections: "National Politics", "Washington Briefs", "State & Local"`;

  const userPrompt = `Generate today's edition for ${today}.

STEP 1: Search X/Twitter for what's TRENDING right now. Look at:
- Trending topics and hashtags
- Posts with massive engagement (likes, reposts, replies)
- Political controversies and debates happening NOW
- Viral moments, scandals, investigations
- Stories people are angry or excited about

STEP 2: Identify the 8-10 BIGGEST stories based on X engagement. Examples of what to look for:
- Federal investigations and fraud cases (like Medicaid fraud, government waste)
- Political figures doing controversial things
- Breaking news that's going viral
- State/local stories getting national attention on X
- Policy debates generating outrage on either side

STEP 3: Write detailed articles about each. Include:
- Specific names of people and organizations involved
- Dollar amounts, dates, locations
- Quotes from X posts or news sources
- Why people are talking about this
- Multiple perspectives when relevant

Output 8-10 articles as JSON:
{
  "articles": [
    {
      "headline": "Specific headline with key facts and names",
      "subheadline": "More context or null",
      "leadParagraph": "70-90 word opening covering who, what, when, where, why",
      "body": "300-400 words with details, quotes, context. Use \\n\\n between paragraphs",
      "section": "National Politics|Washington Briefs|State & Local",
      "isLeadStory": true
    }
  ]
}

The FIRST article should be the #1 trending political story. Set isLeadStory: true for first, false for rest.
Output ONLY valid JSON, nothing else.`;

  const response = await callGrokAPI([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  // Parse the JSON response
  let articlesData: { articles: RawArticle[] };
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    articlesData = JSON.parse(jsonMatch[0]) as { articles: RawArticle[] };
  } catch (parseError) {
    console.error("Failed to parse Grok response:", parseError);
    throw new Error("Failed to parse article data from AI response");
  }

  // Transform into our Article type
  const timestamp = new Date().toISOString();
  const articles: Article[] = articlesData.articles.map((raw, index) => ({
    id: `article-${Date.now()}-${index}`,
    headline: raw.headline,
    subheadline: raw.subheadline,
    leadParagraph: raw.leadParagraph,
    body: raw.body,
    section: validateSection(raw.section),
    byline: "The American Standard Staff",
    publishedAt: timestamp,
    isLeadStory: index === 0, // First article is lead story
    wordCount: countWords(raw.leadParagraph + " " + raw.body),
    // Images would be added separately in production
  }));

  return articles;
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
  const isSameOrigin = origin?.includes("localhost") || 
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
