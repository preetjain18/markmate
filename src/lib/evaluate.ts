import { randomUUID } from "node:crypto";
import { MAX_ANSWER_CHARS, MIN_ANSWER_CHARS } from "./answer";
import { compareAttempts } from "./compare";
import type { ModelCaller } from "./llm";
import { localMark, MARKER_NAME } from "./localmark";
import { EXAMINER_SYSTEM, examinerUser } from "./prompt";
import { missingKeywords, missingReferences } from "./references";
import {
  MODEL_OUTPUT_JSON_SCHEMA,
  ModelOutputSchema,
  type AttemptResult,
  type ModelOutput,
  type PreviousAttempt,
  type Rubric,
} from "./schema";
import { scorePoints, totals } from "./scoring";

export { MAX_ANSWER_CHARS };

export class InputError extends Error {}
export class ModelOutputError extends Error {
  constructor() {
    super("The AI returned an answer we could not read, twice.");
  }
}

/** Ask the model for per-point judgements; validate with zod and retry once. */
async function aiMark(rubric: Rubric, answer: string, callModel: ModelCaller): Promise<{ output: ModelOutput; model: string }> {
  const user = examinerUser(rubric, answer);
  for (let i = 0; i < 2; i++) {
    const res = await callModel({
      system: EXAMINER_SYSTEM,
      user: i === 0 ? user : `${user}\n\nYour previous reply was not valid JSON for the schema. Reply with valid JSON only.`,
      schema: MODEL_OUTPUT_JSON_SCHEMA,
      schemaName: "marking",
    });
    const parsed = ModelOutputSchema.safeParse(res.data);
    if (parsed.success) return { output: parsed.data, model: res.model };
  }
  throw new ModelOutputError();
}

/**
 * Marks an answer. With a model caller the AI proposes judgements; without one (or if the AI fails)
 * the local rule-based marker does. Either way, code verifies quotes and decides the numbers.
 */
export async function evaluate(args: {
  rubric: Rubric;
  answer: string;
  callModel?: ModelCaller;
  previous?: PreviousAttempt;
}): Promise<AttemptResult> {
  const { rubric, callModel, previous } = args;
  const answer = args.answer.trim();
  if (answer.length < MIN_ANSWER_CHARS) throw new InputError("Write a little more first. The answer is too short to mark.");
  if (answer.length > MAX_ANSWER_CHARS) throw new InputError(`The answer is too long (limit ${MAX_ANSWER_CHARS} characters).`);

  let output: ModelOutput;
  let model = MARKER_NAME;
  let aiError: string | undefined;
  if (callModel) {
    try {
      ({ output, model } = await aiMark(rubric, answer, callModel));
    } catch (e) {
      aiError = (e as Error).message;
      output = localMark(rubric, answer);
    }
  } else {
    output = localMark(rubric, answer);
  }

  const points = scorePoints(rubric, answer, output);
  const t = totals(rubric, points);
  const result: AttemptResult = {
    attemptId: randomUUID(),
    rubricId: rubric.id,
    rubricVersion: rubric.version,
    verified: rubric.verified,
    maxMarks: rubric.maxMarks,
    ...(rubric.sources.length ? { sources: rubric.sources } : {}),
    ...t,
    points,
    missingReferences: missingReferences(rubric, answer),
    missingKeywords: missingKeywords(rubric, answer),
    presentationTips: output.presentationTips.map((s) => s.trim()).filter(Boolean).slice(0, 3),
    model,
    aiUsed: model !== MARKER_NAME,
    aiError,
    createdAt: new Date().toISOString(),
  };
  if (previous) result.comparison = compareAttempts(previous, rubric.id, rubric.version, points, t.estimatedMarks);
  return result;
}
