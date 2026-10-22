import { randomUUID } from "node:crypto";
import { compareAttempts } from "./compare";
import type { ModelCaller } from "./llm";
import { EXAMINER_SYSTEM, examinerUser } from "./prompt";
import { missingKeywords, missingReferences } from "./references";
import {
  MODEL_OUTPUT_JSON_SCHEMA,
  ModelOutputSchema,
  type AttemptResult,
  type PreviousAttempt,
  type Rubric,
} from "./schema";
import { scorePoints, totals } from "./scoring";

export const MAX_ANSWER_CHARS = 8000;

export class InputError extends Error {}
export class ModelOutputError extends Error {
  constructor() {
    super("The AI returned an answer we could not read, twice. Please try again.");
  }
}

export async function evaluate(args: {
  rubric: Rubric;
  answer: string;
  callModel: ModelCaller;
  previous?: PreviousAttempt;
}): Promise<AttemptResult> {
  const { rubric, callModel, previous } = args;
  const answer = args.answer.trim();
  if (answer.length < 20) throw new InputError("Write a little more first. The answer is too short to mark.");
  if (answer.length > MAX_ANSWER_CHARS) throw new InputError(`The answer is too long (limit ${MAX_ANSWER_CHARS} characters).`);

  const user = examinerUser(rubric, answer);
  let parsed = null as ReturnType<typeof ModelOutputSchema.safeParse> | null;
  let modelName = "";
  for (let i = 0; i < 2; i++) {
    const res = await callModel({
      system: EXAMINER_SYSTEM,
      user: i === 0 ? user : `${user}\n\nYour previous reply was not valid JSON for the schema. Reply with valid JSON only.`,
      schema: MODEL_OUTPUT_JSON_SCHEMA,
      schemaName: "marking",
    });
    modelName = res.model;
    parsed = ModelOutputSchema.safeParse(res.data);
    if (parsed.success) break;
  }
  if (!parsed || !parsed.success) throw new ModelOutputError();

  const points = scorePoints(rubric, answer, parsed.data);
  const t = totals(rubric, points);
  const result: AttemptResult = {
    attemptId: randomUUID(),
    rubricId: rubric.id,
    rubricVersion: rubric.version,
    verified: rubric.verified,
    maxMarks: rubric.maxMarks,
    ...t,
    points,
    missingReferences: missingReferences(rubric, answer),
    missingKeywords: missingKeywords(rubric, answer),
    presentationTips: parsed.data.presentationTips.map((s) => s.trim()).filter(Boolean).slice(0, 3),
    model: modelName,
    createdAt: new Date().toISOString(),
  };
  if (previous) result.comparison = compareAttempts(previous, rubric.id, rubric.version, points, t.estimatedMarks);
  return result;
}
