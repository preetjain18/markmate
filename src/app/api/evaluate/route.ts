import { after, NextResponse } from "next/server";
import { z } from "zod";
import { VersionMismatchError } from "@/lib/compare";
import { evaluate, InputError, ModelOutputError } from "@/lib/evaluate";
import { callModel, ModelCallError, NotConfiguredError, OutOfCreditsError } from "@/lib/llm";
import { logAttempt } from "@/lib/logging";
import { getRubric } from "@/lib/rubrics";
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
    rubric = getRubric(body.questionId);
    if (!rubric) return fail("That question was not found.", 404);
  } else {
    const parsed = RubricSchema.safeParse(body.rubric);
    if (!parsed.success) return fail("The marking points must add up to the total marks.", 400);
    rubric = { ...parsed.data, verified: false, custom: true };
  }

  try {
    const result = await evaluate({ rubric, answer: body.answer, callModel, previous: body.previous });
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
    if (e instanceof NotConfiguredError) return fail(e.message, 503);
    if (e instanceof OutOfCreditsError) return fail(e.message, 402);
    if (e instanceof ModelOutputError || e instanceof ModelCallError) return fail(e.message, 502);
    return fail("Something went wrong while marking. Please try again.", 500);
  }
}
