import { NextResponse } from "next/server";
import { loadRubrics } from "@/lib/rubrics";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const questions = loadRubrics().map((r) => ({
    id: r.id,
    sa: r.sa,
    topic: r.topic,
    question: r.question,
    maxMarks: r.maxMarks,
    verified: r.verified,
  }));
  return NextResponse.json({ questions });
}
