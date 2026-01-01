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
        mode: "on",
        sources: [
          { type: "x" },       // X/Twitter search for trending topics
          { type: "news" },    // News sources
          { type: "web" },     // Web search
        ],
        max_search_results: 30,
        return_citations: true,
      },
      temperature: 0.7, // Higher for more variety in story selection
      max_tokens: 16000, // More tokens for 8-10 detailed articles with quotes
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Grok API error response:", error);
    throw new Error(`Grok API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as GrokResponse;
  const content = data.choices[0]?.message?.content || "";
  console.log("Grok response length:", content.length);
  return content;
}

async function generateArticles(): Promise<Article[]> {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const systemPrompt = `You are a newspaper editor for "The American Standard" with the tagline "Clear. Fair. American."

YOUR PRIMARY JOB: Find what's TRENDING and VIRAL on X/Twitter right now, capture HOW AMERICANS ARE FEELING about these stories, and write engaging newspaper articles.

KEY PRINCIPLES:
1. Search X for what people are ACTUALLY talking about RIGHT NOW
2. Find stories with massive engagement (10K, 50K, 100K+ posts)
3. CAPTURE THE EMOTION - are people outraged? Celebrating? Divided? Skeptical?
4. QUOTE REAL X USERS by their @handle with their actual posts
5. Cover scandals, fraud, controversies, viral moments, political drama

Your articles should feel like a blend of traditional journalism AND a pulse check on American sentiment. Readers should understand both WHAT happened and HOW PEOPLE ARE REACTING.

Style: Traditional newspaper voice but with real quotes from X users showing public reaction.
Article length: 350-500 words with specific names, numbers, X user quotes with @handles.

Sections: "National Politics", "Washington Briefs", "State & Local"`;

  const userPrompt = `Generate today's edition for ${today}.

STEP 1: Search X/Twitter for what's TRENDING right now:
- Trending topics and hashtags with high post counts
- Viral posts generating massive engagement
- Political controversies sparking heated debate
- Stories making people ANGRY, EXCITED, WORRIED, or HOPEFUL
- Scandals, investigations, fraud cases, political drama

STEP 2: For each story, capture THE EMOTIONAL REACTION:
- What are people saying? Quote actual X users with their @handles
- Are Americans outraged? Supportive? Divided? Mocking?
- What's the sentiment breakdown - is it mostly one side or split?
- Find the most viral/liked responses and reactions

STEP 3: Write 8-10 articles that include:
- The facts: names, dates, dollar amounts, locations
- THE PUBLIC REACTION: "Many Americans expressed outrage..." or "The post sparked celebration among..."
- DIRECT QUOTES from X users: '@username wrote: "actual quote from their post"'
- Multiple perspectives when the reaction is divided
- Why this story is resonating emotionally with people

Output as JSON:
{
  "articles": [
    {
      "headline": "Headline capturing both the story and the reaction",
      "subheadline": "Context about public sentiment or null",
      "leadParagraph": "80-100 words covering the story AND how Americans are reacting",
      "body": "350-450 words with facts, X user quotes with @handles, emotional context. Use \\n\\n between paragraphs",
      "section": "National Politics|Washington Briefs|State & Local",
      "isLeadStory": true
    }
  ]
}

First article = #1 trending story (isLeadStory: true). Rest = false.
INCLUDE REAL @usernames and their quotes in the articles.
Output ONLY valid JSON.`;

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
      console.error("No JSON found in response. First 500 chars:", response.substring(0, 500));
      throw new Error("No JSON found in response");
    }
    articlesData = JSON.parse(jsonMatch[0]) as { articles: RawArticle[] };
    console.log("Parsed articles count:", articlesData.articles?.length || 0);
  } catch (parseError) {
    console.error("Failed to parse Grok response:", parseError);
    console.error("Response preview:", response.substring(0, 1000));
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
