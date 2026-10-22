import { normalise } from "./evidence";
import type { Rubric } from "./schema";

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** SA references from the rubric that the answer never mentions ("SA 570" matches "SA-570"). */
export function missingReferences(rubric: Rubric, answer: string): string[] {
  const a = squash(answer);
  const all = new Set([...rubric.references, ...rubric.points.flatMap((p) => p.references)]);
  return [...all].filter((r) => !a.includes(squash(r)));
}

/** Keywords from the rubric that the answer never uses. */
export function missingKeywords(rubric: Rubric, answer: string): string[] {
  const a = normalise(answer);
  const all = new Set([...rubric.keywords, ...rubric.points.flatMap((p) => p.keywords)]);
  return [...all].filter((k) => !a.includes(normalise(k)));
}
