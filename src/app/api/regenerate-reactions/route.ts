import { NextResponse } from "next/server";
import { getEdition, saveEdition } from "@/lib/kv";
import type { Article, XReaction } from "@/types/edition";
import { getTodayDateString } from "@/types/edition";

export const runtime = "nodejs";
export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET;

interface GrokResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

async function getReactionsForArticle(headline: string, topic: string): Promise<XReaction[]> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("XAI_API_KEY not configured");

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-3-latest",
      messages: [
        {
          role: "user",
          content: `Find 5 controversial X posts about this topic from 5 DIFFERENT VERIFIED users (blue checkmarks):

Topic: ${headline}
Context: ${topic}

Return JSON only:
{
  "reactions": [
    {
      "handle": "@username",
      "displayName": "Display Name",
      "quote": "Their controversial post",
      "url": "https://x.com/username/status/123",
      "verified": true,
      "likes": "12.5K",
      "reposts": "3.2K"
    }
  ]
}

Requirements:
- 5 DIFFERENT users, not the same person multiple times
- VERIFIED accounts only (blue checkmarks)
- Hot takes, controversial opinions, things that sparked debate
- Show different perspectives/the divide`,
        },
      ],
      search_parameters: {
        mode: "on",
        sources: [{ type: "x" }],
        max_search_results: 15,
        return_citations: true,
      },
      temperature: 0.5,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Grok error:", error);
    throw new Error(`Grok API error: ${response.status}`);
  }

  const data = (await response.json()) as GrokResponse;
  const content = data.choices[0]?.message?.content || "";

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]);
    return (parsed.reactions || []).map((r: XReaction) => ({
      handle: r.handle?.startsWith("@") ? r.handle : `@${r.handle}`,
      displayName: r.displayName,
      quote: r.quote,
      url: r.url,
      verified: true,
      likes: r.likes,
      reposts: r.reposts,
    }));
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = getTodayDateString();
    const edition = await getEdition(today);

    if (!edition) {
      return NextResponse.json({ error: "No edition found for today" }, { status: 404 });
    }

    console.log(`Regenerating reactions for ${edition.articles.length} articles...`);

    // Process in batches of 3 to avoid rate limits
    for (let i = 0; i < edition.articles.length; i += 3) {
      const batch = edition.articles.slice(i, i + 3);
      const promises = batch.map(async (article) => {
        try {
          const reactions = await getReactionsForArticle(
            article.headline,
            article.leadParagraph
          );
          article.xReactions = reactions.length > 0 ? reactions : undefined;
          console.log(`Got ${reactions.length} reactions for: ${article.headline.substring(0, 40)}...`);
        } catch (err) {
          console.error(`Failed reactions for ${article.headline}:`, err);
        }
      });

      await Promise.all(promises);

      if (i + 3 < edition.articles.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // Save updated edition
    await saveEdition(edition);

    return NextResponse.json({
      success: true,
      message: "Reactions regenerated",
      articleCount: edition.articles.length,
    });
  } catch (error) {
    console.error("Error regenerating reactions:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
