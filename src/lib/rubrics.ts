import fs from "node:fs";
import path from "node:path";
import { normalise } from "./evidence";
import { RubricDraftSchema, RubricSchema, type Rubric, type RubricDraft } from "./schema";

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

/** Keep only keywords and references that really appear in the pasted model answer. */
export function buildCustomRubric(question: string, modelAnswer: string, maxMarks: number, draft: RubricDraft): Rubric {
  RubricDraftSchema.parse(draft);
  const text = normalise(modelAnswer);
  const squashed = modelAnswer.toLowerCase().replace(/[^a-z0-9]/g, "");
  const keep = (ks: string[]) => ks.filter((k) => k.trim() && text.includes(normalise(k)));
  const keepRefs = (rs: string[]) => rs.filter((r) => r.trim() && squashed.includes(r.toLowerCase().replace(/[^a-z0-9]/g, "")));
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
      marks: p.marks,
      description: p.description,
      keywords: keep(p.keywords),
      references: keepRefs(p.references),
    })),
    keywords: [],
    references: [],
  };
}
