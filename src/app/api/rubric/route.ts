import { NextResponse } from "next/server";
import { z } from "zod";
import { callModel, ModelCallError, NotConfiguredError, OutOfCreditsError } from "@/lib/llm";
import { RUBRIC_SYSTEM, rubricUser } from "@/lib/prompt";
import { buildCustomRubric } from "@/lib/rubrics";
import { RUBRIC_DRAFT_JSON_SCHEMA, RubricDraftSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  question: z.string().min(10).max(3000),
  modelAnswer: z.string().min(30).max(8000),
  maxMarks: z.number().min(1).max(20),
});

const fail = (message: string, status: number) => NextResponse.json({ error: message }, { status });

/** Drafts an unverified marking scheme from a pasted model answer. The user edits marks before use. */
export async function POST(req: Request) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return fail("Paste a question, its model answer, and the total marks.", 400);
  }
  try {
    let draft = null as ReturnType<typeof RubricDraftSchema.safeParse> | null;
    for (let i = 0; i < 2 && !draft?.success; i++) {
      const res = await callModel({
        system: RUBRIC_SYSTEM,
        user: rubricUser(body.question, body.modelAnswer, body.maxMarks),
        schema: RUBRIC_DRAFT_JSON_SCHEMA,
        schemaName: "rubric_draft",
      });
      draft = RubricDraftSchema.safeParse(res.data);
    }
    if (!draft?.success) return fail("The AI could not draft a marking scheme. Please try again.", 502);
    return NextResponse.json({ rubric: buildCustomRubric(body.question, body.modelAnswer, body.maxMarks, draft.data) });
  } catch (e) {
    if (e instanceof NotConfiguredError) return fail(e.message, 503);
    if (e instanceof OutOfCreditsError) return fail(e.message, 402);
    if (e instanceof ModelCallError) return fail(e.message, 502);
    return fail("Something went wrong. Please try again.", 500);
  }
}
