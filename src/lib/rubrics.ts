import fs from "node:fs";
import path from "node:path";
import { normalise } from "./evidence";
import { RubricSchema, type Rubric, type RubricDraft } from "./schema";
import { roundHalf } from "./scoring";

const DIR = path.join(process.cwd(), "data", "rubrics");

export function loadRubrics(): Rubric[] {
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => RubricSchema.parse(JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"))));
}

export function getRubric(id: string): Rubric | undefined {
  return loadRubrics().find((r) => r.id === id);
}

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Turns an AI-drafted marking scheme into an unverified rubric. Code keeps only keywords and
 * SA references that really appear in the pasted model answer; the user edits marks until they add up.
 */
export function rubricFromDraft(question: string, modelAnswer: string, maxMarks: number, draft: RubricDraft): Rubric {
  const text = normalise(modelAnswer);
  const squashed = squash(modelAnswer);
  return {
    id: `custom-${Date.now().toString(36)}`,
    version: "custom-1",
    sa: "Custom",
    topic: "Custom question",
    question,
    maxMarks,
    verified: false,
    custom: true,
    points: draft.points.map((p, i) => ({
      id: `p${i + 1}`,
      label: p.label,
      marks: Math.max(0.5, roundHalf(p.marks)),
      description: p.description,
      keywords: p.keywords.filter((k) => k.trim() && text.includes(normalise(k))),
      references: p.references.filter((r) => r.trim() && squashed.includes(squash(r))),
    })),
    keywords: [],
    references: [],
  };
}

const STOP = new Set("about after also because before being could each from have into more must only other should some such than that their then there these they this those under when where which while will with would".split(" "));

/**
 * Drafts an unverified marking scheme from a pasted model answer, in code (used when the AI is not available).
 * Sentences are grouped into points; keywords and SA references come only from the model answer itself.
 * The user edits the marks until they add up.
 */
export function buildCustomRubric(question: string, modelAnswer: string, maxMarks: number): Rubric {
  const sentences = modelAnswer
    .split(/(?<=[.!?;])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 15);
  const k = Math.max(1, Math.min(sentences.length, Math.round(maxMarks)));
  const size = Math.ceil(sentences.length / k);
  const chunks: string[] = [];
  for (let i = 0; i < sentences.length; i += size) chunks.push(sentences.slice(i, i + size).join(" "));
  if (!chunks.length) chunks.push(modelAnswer.trim());

  // Spread the marks in half-mark steps; any remainder goes to the first points.
  const units = Math.round(maxMarks * 2);
  const base = Math.floor(units / chunks.length);
  let extra = units - base * chunks.length;

  const points = chunks.map((text, i) => {
    const units_i = base + (extra-- > 0 ? 1 : 0);
    const freq = new Map<string, number>();
    for (const w of text.toLowerCase().match(/[a-z]{6,}/g) ?? []) if (!STOP.has(w)) freq.set(w, (freq.get(w) ?? 0) + 1);
    const keywords = [...freq].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w]) => w);
    const references = [...new Set((text.match(/\bSA[\s-]?\d{3}\b/gi) ?? []).map((r) => r.toUpperCase().replace(/[\s-]/, " ")))];
    return {
      id: `p${i + 1}`,
      label: text.length > 70 ? text.slice(0, 67).trimEnd() + "..." : text,
      marks: roundHalf(units_i / 2),
      description: text,
      keywords,
      references,
    };
  });

  return {
    id: `custom-${Date.now().toString(36)}`,
    version: "custom-1",
    sa: "Custom",
    topic: "Custom question",
    question,
    maxMarks,
    verified: false,
    custom: true,
    points,
    keywords: [],
    references: [],
  };
}
