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
          { type: "x", post_view_count: 1000 },  // X posts with 1K+ views
          { type: "news" },   // News sources
          { type: "web" },    // Web sources
        ],
        max_search_results: 25, // More sources for better coverage
        return_citations: true,
      },
      temperature: 0.6, // Balanced for variety and consistency
      max_tokens: 8000, // More tokens for 6-8 detailed articles
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

  const systemPrompt = `You are a professional newspaper editor for "The American Standard," a trusted American daily newspaper with the tagline "Clear. Fair. American."

Your task is to create today's edition based on TRENDING and VIRAL stories from X/Twitter and breaking news. Focus on stories that are getting significant engagement and discussion RIGHT NOW.

IMPORTANT: Prioritize stories that are:
- TRENDING on X with high post counts (10K+ posts)
- Breaking news in the last 24-48 hours
- Generating significant public debate or outrage
- Major political scandals, investigations, or developments

Style guidelines:
- Write in a traditional, authoritative newspaper voice
- Be politically neutral and fair to all sides
- Focus on facts, not sensationalism
- Use proper journalistic structure (inverted pyramid)
- Each article should be 250-400 words
- Include specific details, names, numbers, and quotes when available

Sections to use:
- "National Politics" - Federal government, Congress, White House
- "Washington Briefs" - DC-focused shorter items
- "State & Local" - State government, regional news, local scandals

IMPORTANT: All articles must be credited to "The American Standard Staff".`;

  const userPrompt = `Generate today's edition for ${today}.

Search for the TOP TRENDING political stories on X/Twitter right now. Look for:
- Stories with 10K+ posts trending
- Major scandals or investigations (fraud, corruption, etc.)
- Breaking political news
- Viral political moments
- State and local stories getting national attention

Write 6-8 articles covering the MOST TALKED ABOUT stories. Include specific details like names, dollar amounts, locations, and quotes.

ONLY output valid JSON:
{
  "articles": [
    {
      "headline": "Specific, detailed headline with key facts",
      "subheadline": "Additional context or null",
      "leadParagraph": "60-80 word opening with who, what, when, where, why",
      "body": "250-350 word body with details, quotes, and context. Paragraphs separated by \\n\\n",
      "section": "National Politics|Washington Briefs|State & Local",
      "isLeadStory": true
    }
  ]
}

First article is lead story (isLeadStory: true), rest are false. Output ONLY JSON.`;

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

  const today = getTodayDateString();

  try {
    // Check if we already have today's edition
    const exists = await editionExists(today);
    if (exists) {
      return NextResponse.json({
        success: true,
        message: "Edition already exists for today",
        date: today,
      });
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
