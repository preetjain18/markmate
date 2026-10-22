import { after, NextResponse } from "next/server";
import { z } from "zod";
import { VersionMismatchError } from "@/lib/compare";
import { evaluate, InputError } from "@/lib/evaluate";
import { aiConfigured, callModel } from "@/lib/llm";
import { logAttempt } from "@/lib/logging";
import { loadCatalog, resolveForEvaluation } from "@/lib/catalog";
import { PreviousAttemptSchema, RubricSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  questionId: z.string().optional(),
  rubric: z.unknown().optional(),
  answer: z.string(),
  sessionId: z.string().max(100).default("anonymous"),
  attemptNo: z.number().int().min(1).default(1),
  previous: PreviousAttemptSchema.optional(),
});

const fail = (message: string, status: number) => NextResponse.json({ error: message }, { status });

export async function POST(req: Request) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return fail("The request was not in the expected format.", 400);
  }

  let rubric;
  if (body.questionId) {
    const found = resolveForEvaluation(loadCatalog(), body.questionId);
    if (found.kind === "not-found") return fail("That question was not found.", 404);
    // A question without a rubric is practice-only: never produce a score for it.
    if (found.kind === "unsupported") return fail("Evaluation isn't available for this question yet, so no marks can be given.", 422);
    rubric = found.rubric;
  } else {
    const parsed = RubricSchema.safeParse(body.rubric);
    if (!parsed.success) return fail("The marking points must add up to the total marks.", 400);
    rubric = { ...parsed.data, verified: false, custom: true };
  }

  try {
    const result = await evaluate({
      rubric,
      answer: body.answer,
      callModel: aiConfigured() ? callModel : undefined,
      previous: body.previous,
    });
    after(() =>
      logAttempt({
        result,
        sessionId: body.sessionId,
        attemptNo: body.attemptNo,
        questionId: rubric.id,
        answerText: body.answer,
      }),
    );
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof InputError || e instanceof VersionMismatchError) return fail(e.message, 400);
    return fail("Something went wrong while marking. Please try again.", 500);
  }
}
