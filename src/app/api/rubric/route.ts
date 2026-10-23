import { NextResponse } from "next/server";
import { z } from "zod";
import { aiConfigured, callModel } from "@/lib/llm";
import { RUBRIC_FROM_QUESTION_SYSTEM, RUBRIC_SYSTEM, rubricFromQuestionUser, rubricUser } from "@/lib/prompt";
import { buildCustomRubric, rubricFromDraft } from "@/lib/rubrics";
import { RUBRIC_DRAFT_JSON_SCHEMA, RubricDraftSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  question: z.string().min(10).max(3000),
  /** Optional. Without it, the AI drafts the points from the question alone. */
  modelAnswer: z
    .string()
    .max(8000)
    .default("")
    .refine((s) => s.trim() === "" || s.trim().length >= 30, "A model answer, if given, needs at least 30 characters."),
  maxMarks: z.number().min(1).max(20),
});

/**
 * Drafts an unverified marking scheme. With a model answer, Gemini splits it into points (or code does,
 * if the AI fails). Without one, Gemini drafts the points from the question alone; that needs the AI.
 * The user checks and edits the marks before use.
 */
export async function POST(req: Request) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Add the question and the total marks (and the model answer, if you have one)." }, { status: 400 });
  }
  const fromQuestion = body.modelAnswer.trim() === "";

  if (aiConfigured()) {
    try {
      for (let i = 0; i < 2; i++) {
        const res = await callModel({
          system: fromQuestion ? RUBRIC_FROM_QUESTION_SYSTEM : RUBRIC_SYSTEM,
          user: fromQuestion ? rubricFromQuestionUser(body.question, body.maxMarks) : rubricUser(body.question, body.modelAnswer, body.maxMarks),
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
  if (fromQuestion)
    return NextResponse.json(
      { error: "The AI couldn't draft marking points from the question just now. Try again in a moment, or add a model answer." },
      { status: 503 },
    );
  return NextResponse.json({ rubric: buildCustomRubric(body.question, body.modelAnswer, body.maxMarks), draftedBy: "local" });
}
