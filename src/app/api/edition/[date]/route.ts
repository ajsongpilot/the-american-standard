import { NextResponse } from "next/server";
import { getEdition } from "@/lib/kv";

export const runtime = "edge";

interface RouteParams {
  params: Promise<{
    date: string;
  }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { date } = await params;
  
  const edition = await getEdition(date);
  
  if (!edition) {
    return NextResponse.json({ error: "Edition not found" }, { status: 404 });
  }
  
  return NextResponse.json(edition);
}
