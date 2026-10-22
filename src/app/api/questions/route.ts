import { NextResponse } from "next/server";
import { loadCatalog } from "@/lib/catalog";

export const runtime = "nodejs";
export const maxDuration = 60;

/** The practice catalog: levels, subjects, chapters, topics and questions, with evaluation support per question. */
export async function GET() {
  return NextResponse.json(loadCatalog().view);
}
