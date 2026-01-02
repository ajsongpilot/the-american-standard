import { NextResponse } from "next/server";
import { getEdition, deleteArticle } from "@/lib/kv";

export const runtime = "nodejs";

const CRON_SECRET = process.env.CRON_SECRET;

interface RouteParams {
  params: Promise<{
    date: string;
    articleId: string;
  }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { date, articleId } = await params;
  
  const edition = await getEdition(date);
  
  if (!edition) {
    return NextResponse.json({ error: "Edition not found" }, { status: 404 });
  }
  
  const article = edition.articles.find((a) => a.id === articleId);
  
  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }
  
  return NextResponse.json(article);
}

export async function DELETE(request: Request, { params }: RouteParams) {
  // Auth check
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date, articleId } = await params;
  
  const success = await deleteArticle(date, articleId);
  
  if (!success) {
    return NextResponse.json({ error: "Article not found or failed to delete" }, { status: 404 });
  }
  
  return NextResponse.json({ success: true, message: `Article ${articleId} deleted from ${date}` });
}
