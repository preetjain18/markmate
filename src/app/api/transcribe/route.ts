import { NextResponse } from "next/server";
import { aiConfigured, callModel, ModelCallError, NotConfiguredError } from "@/lib/llm";
import { MAX_TOTAL_BASE64, NotAnAnswerError, transcribe, TranscribeRequestSchema } from "@/lib/transcribe";

export const runtime = "nodejs";
export const maxDuration = 60;

const fail = (message: string, status: number) => NextResponse.json({ error: message }, { status });

/**
 * Reads a handwritten answer from up to 4 photos. Photos are sent to the AI provider for reading and
 * are not stored by MarkMate. There is no non-AI fallback: without the AI, this returns a clear error.
 */
export async function POST(req: Request) {
  let body;
  try {
    body = TranscribeRequestSchema.parse(await req.json());
  } catch {
    return fail("Upload 1 to 4 files: photos (JPG, PNG or WebP) or PDFs.", 400);
  }
  if (body.images.reduce((s, i) => s + i.data.length, 0) > MAX_TOTAL_BASE64) {
    return fail("These files are too large together (limit about 3 MB). Upload fewer pages, smaller photos or a smaller PDF.", 413);
  }
  if (!aiConfigured()) {
    return fail("Reading handwriting needs the AI, which isn't set up on this site yet. You can type your answer instead.", 503);
  }
  try {
    const t = await transcribe(body.images, callModel, body.question, body.mode);
    return NextResponse.json(t);
  } catch (e) {
    if (e instanceof NotAnAnswerError) return fail(e.message, 422);
    if (e instanceof NotConfiguredError) return fail("Reading handwriting needs the AI, which isn't set up on this site yet.", 503);
    if (e instanceof ModelCallError) return fail(`Your handwriting couldn't be read right now: ${e.message.replace(/\.$/, "")}. You can type your answer instead.`, 502);
    return fail("Your handwriting couldn't be read right now. Please try again, or type your answer.", 502);
  }
}
