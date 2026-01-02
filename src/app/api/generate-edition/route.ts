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

// Call Grok API with search enabled (expensive - use sparingly)
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
        max_search_results: 25,
        return_citations: true,
      },
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Grok API error (with search):", response.status, error);
    throw new Error(`Grok API error: ${response.status} - ${error.substring(0, 200)}`);
  }

  const data = (await response.json()) as GrokResponse;
  return data.choices[0]?.message?.content || "";
}

// Call Grok API WITHOUT search (much cheaper - use for writing)
async function callGrokBasic(
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
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Grok API error (basic):", response.status, error);
    throw new Error(`Grok API error: ${response.status} - ${error.substring(0, 200)}`);
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
        content: `What are the top 20-25 stories Americans are talking about on X RIGHT NOW?

CRITICAL: Start with THE #1 HOTTEST TRENDING TOPIC on X. What has the most posts, the most engagement, the most controversy RIGHT NOW? That MUST be the first story.

Search X/Twitter for what's ACTUALLY trending TODAY:

LEAD STORY (1-2):
- THE single biggest story on X right now - most posts, most engagement
- If there's a viral scandal, fraud case, or controversy dominating X, this is it

NATIONAL POLITICS (5-6 stories):
- Trump administration actions
- Federal policy, immigration, economy
- Major political figures

WASHINGTON BRIEFS (4-5 stories):
- Congress, DOJ, FBI, federal agencies
- Government scandals, investigations, fraud

THE STATES (3-4 stories):
- Governors, state scandals
- Regional stories going national

GEOPOLITICS (3-4 stories):
- US foreign policy affecting Americans
- Trade, tariffs, international conflicts

CULTURE (4-5 stories):
- Hot debates on X (H1B, tech, etc.)
- Viral moments, videos
- Generational issues (Boomers vs Millennials economics, etc.)

RULES:
- FIRST STORY must be THE hottest thing on X right now
- Include viral videos, citizen journalists, scandals
- Names, numbers, specifics
- If something has millions of views on X, it should be here

FRESH NEWS ONLY:
- Stories must be about what happened in the LAST 48 HOURS
- If something happened in November, it's NOT news unless there's a NEW development TODAY
- BAD: "Trump signed X bill in November" (old news)
- GOOD: "DOJ misses deadline TODAY on Epstein files" (today's development)
- The DATE in your title/description should be recent (late Dec 2025 or Jan 2026)

NO DUPLICATES - CRITICAL:
- Each story must have a DIFFERENT ANGLE or be about a DIFFERENT EVENT
- If covering a big story (like a scandal), give ONE comprehensive entry - don't split into "Part 1" and "Part 2"
- BAD: "Trump Immigration Crackdown" + "Trump Deportation Plan" (same story, same angle)
- GOOD: "Trump Immigration Crackdown" + "Texas Governor Deploys Guard" (related but different angle)
- Before adding a story, check if you already have essentially the same story

For each story:
1. Specific title with names, numbers
2. Why it's trending
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

  // Use search for accuracy + X Reactions (Media Watch disabled separately to save costs)
  const response = await callGrokWithSearch(
    [
      {
        role: "system",
        content: `You are a journalist for The American Standard - a populist newspaper that serves THE AMERICAN PEOPLE.
Today's date is ${today}.

OUR MISSION: American news FOR Americans. We hold the government ACCOUNTABLE to the people who pay their salaries.

JOURNALISM STANDARDS (follow these strictly):

ACCURACY & VERIFICATION:
- Verify all facts are CURRENT - do not use outdated information
- Attribute all claims to sources (officials, reports, X posts)
- If uncertain about a fact, do not include it
- Verify people referenced are alive and currently active

NO FABRICATION:
- NEVER invent quotes, sources, or events
- NEVER attribute statements to people who didn't make them
- Only use real quotes from X posts or official statements you found

HEADLINE VARIETY:
- Write headlines that inform, not just inflame
- VARY your vocabulary - don't use the same dramatic word on multiple headlines
- Words like "firestorm", "slammed", "sparks outrage" are fine occasionally, but not on every article
- Mix dramatic headlines with specific factual ones
- Good variety: "DOJ Misses Epstein Deadline" + "Immigration Ban Sparks Debate" + "Fraud Probe Targets $9B in Losses"
- Bad (repetitive): "Firestorm Over X" + "Y Ignites Firestorm" + "Z Sparks Firestorm"

BALANCE & CONTEXT:
- Present multiple perspectives when relevant
- Explain WHY something matters to readers
- Provide context (numbers, dates, history)
- Distinguish between confirmed facts and allegations

ACCOUNTABILITY FOCUS:
- Name names - who is responsible?
- Focus on ACTIONS, not just statements
- Hold government accountable to the people`,
      },
      {
        role: "user",
        content: `Write a ${isLead ? "500" : "400"}-word article about: ${story.title}

Context: ${story.description}

STRUCTURE:
1. leadParagraph: Start with TODAY's news - what happened in the last 24-48 hours
2. body: Details, context, government actions/failures
3. whatItMeansForYou: 2-3 sentences on direct impact to everyday Americans
4. xReactions: Find the 5 MOST CONTROVERSIAL reactions on X - posts that sparked debate, got people fired up, or show the divide

CRITICAL - LEAD WITH TODAY:
- Your leadParagraph must start with the LATEST development (today or yesterday)
- BAD: "On November 19, Trump signed..." (2 months ago = not news)
- GOOD: "As of January 1, the DOJ has still not released..." (today's status)
- Historical context goes in the body, NOT the lead
- If the newest development is more than a week old, this isn't fresh news

Output as JSON only:
{
  "headline": "Specific factual headline - NO 'firestorm/sparks/ignites/slammed'",
  "subheadline": "Additional context or null",
  "leadParagraph": "80-100 words - the key facts",
  "body": "250-350 words. Use \\n\\n between paragraphs.",
  "whatItMeansForYou": "2-3 sentences: How does this affect YOU as an American?",
  "section": "${story.section}",
  "xReactions": [
    {
      "handle": "@realusername",
      "displayName": "Display Name", 
      "quote": "Their controversial/viral post from X",
      "url": "https://x.com/username/status/123456789",
      "verified": true,
      "likes": "12.5K",
      "reposts": "3.2K"
    }
  ]
}

For xReactions: Find 5 posts from 5 DIFFERENT VERIFIED users (blue checkmarks). Not the same person multiple times. Get controversial hot takes from notable accounts that show the divide.
`,
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

  // Write up to 15 stories (balance coverage vs API cost)
  const storiesToWrite = stories.slice(0, 15);

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

  console.log(`Generated ${articles.length} articles`);

  // PHASE 3: Media Watch - DISABLED to save API costs
  // Uncomment when budget allows (~$1-2 extra per generation)
  /*
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
  */

  // PHASE 3: EDITOR REVIEW
  // Single cheap API call to review all headlines for issues
  console.log("Starting Phase 3: Editor Review...");
  const editedArticles = await editorReview(articles);

  // Clean up temporary storyTopic field
  const cleanedArticles = editedArticles.map(({ ...article }) => {
    const { storyTopic, ...clean } = article as Article & { storyTopic?: string };
    return clean;
  });

  return cleanedArticles;
}

interface EditorFix {
  index: number;
  currentHeadline: string;
  issue: string;
  newHeadline: string;
}

interface EditorResponse {
  fixes: EditorFix[];
  remove: number[];  // Indices of duplicate/weak articles to drop
  issues: string[];
}

async function editorReview(articles: Article[]): Promise<Article[]> {
  // Build a summary of all headlines for the editor to review
  const headlineList = articles
    .map((a, i) => `${i}. [${a.section}] ${a.headline}`)
    .join("\n");

  const response = await callGrokBasic(
    [
      {
        role: "system",
        content: `You are the Editor-in-Chief of The American Standard, reviewing headlines before publication.

Your job is to catch batch-level issues that individual writers miss:

1. REPETITIVE LANGUAGE - Flag if any dramatic word appears 3+ times across all headlines
   - Words like: firestorm, slammed, blasted, ignites, sparks outrage, under fire
   - Suggest alternative headlines that vary the vocabulary

2. DECEASED/OUTDATED REFERENCES - Flag anyone who has died being quoted as currently active
   - Charlie Kirk died September 2024
   - If unsure about someone, flag for fact-check

3. DUPLICATE STORIES - If two articles cover the SAME angle of the SAME story:
   - Keep the one that's more detailed or is marked as lead
   - Mark the weaker one for removal
   - Different aspects of same story are OK (keep both)
   - Same angle twice = remove the weaker one

Return ONLY JSON:
{
  "fixes": [
    {
      "index": 0,
      "currentHeadline": "X Firestorm Over Y",
      "issue": "'Firestorm' used 3 times - vary language",
      "newHeadline": "X Controversy Over Y"
    }
  ],
  "remove": [7],
  "issues": ["Removed article 7 - duplicate angle of article 3"]
}

If no changes needed, return: {"fixes": [], "remove": [], "issues": []}`,
      },
      {
        role: "user",
        content: `Review these ${articles.length} headlines for publication:\n\n${headlineList}`,
      },
    ],
    2000,
    0.3
  );

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.log("Editor review: No JSON response, keeping original headlines");
    return articles;
  }

  try {
    const editorResponse = JSON.parse(jsonMatch[0]) as EditorResponse;
    
    if (editorResponse.issues?.length > 0) {
      console.log("Editor notes:", editorResponse.issues);
    }

    // Apply headline fixes first
    if (editorResponse.fixes?.length > 0) {
      console.log(`Editor making ${editorResponse.fixes.length} headline fixes:`);
      
      for (const fix of editorResponse.fixes) {
        if (fix.index >= 0 && fix.index < articles.length && fix.newHeadline) {
          console.log(`  - Article ${fix.index}: "${fix.issue}"`);
          console.log(`    Before: ${articles[fix.index].headline}`);
          console.log(`    After: ${fix.newHeadline}`);
          articles[fix.index].headline = fix.newHeadline;
        }
      }
    }

    // Remove duplicate/weak articles
    if (editorResponse.remove?.length > 0) {
      console.log(`Editor removing ${editorResponse.remove.length} duplicate articles:`);
      
      // Sort in reverse order so we remove from end first (preserves indices)
      const indicesToRemove = [...editorResponse.remove].sort((a, b) => b - a);
      
      for (const idx of indicesToRemove) {
        if (idx >= 0 && idx < articles.length) {
          console.log(`  - Removing article ${idx}: "${articles[idx].headline}"`);
          articles.splice(idx, 1);
        }
      }
      
      console.log(`${articles.length} articles remaining after edit`);
    }

    if (!editorResponse.fixes?.length && !editorResponse.remove?.length) {
      console.log("Editor review: All articles approved as-is");
    }

    return articles;
  } catch (err) {
    console.error("Editor review parse error:", err);
    return articles;
  }
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
