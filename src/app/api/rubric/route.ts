import { NextResponse } from "next/server";
import { z } from "zod";
import { aiConfigured, callModel } from "@/lib/llm";
import { RUBRIC_SYSTEM, rubricUser } from "@/lib/prompt";
import { buildCustomRubric, rubricFromDraft } from "@/lib/rubrics";
import { RUBRIC_DRAFT_JSON_SCHEMA, RubricDraftSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  question: z.string().min(10).max(3000),
  modelAnswer: z.string().min(30).max(8000),
  maxMarks: z.number().min(1).max(20),
});

/**
 * Drafts an unverified marking scheme from a pasted model answer. Gemini drafts it when configured;
 * otherwise (or if the AI fails) code splits the model answer. The user edits marks before use.
 */
export async function POST(req: Request) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Paste a question, its model answer, and the total marks." }, { status: 400 });
  }

  if (aiConfigured()) {
    try {
      for (let i = 0; i < 2; i++) {
        const res = await callModel({
          system: RUBRIC_SYSTEM,
          user: rubricUser(body.question, body.modelAnswer, body.maxMarks),
          schema: RUBRIC_DRAFT_JSON_SCHEMA,
          schemaName: "rubric_draft",
        });
        const draft = RubricDraftSchema.safeParse(res.data);
        if (draft.success)
          return NextResponse.json({ rubric: rubricFromDraft(body.question, body.modelAnswer, body.maxMarks, draft.data), draftedBy: res.model });
      }
    } catch {
      // Fall through to the local draft.
    }
  }
  return NextResponse.json({ rubric: buildCustomRubric(body.question, body.modelAnswer, body.maxMarks), draftedBy: "local" });
}
