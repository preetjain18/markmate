import type { Comparison, PointChange, PointResult, PreviousAttempt } from "./schema";

export class VersionMismatchError extends Error {
  constructor() {
    super("The first attempt used a different rubric or version, so the two cannot be compared.");
  }
}

/** Everything here is computed in code; the model never writes the comparison. */
export function compareAttempts(
  prev: PreviousAttempt,
  rubricId: string,
  rubricVersion: string,
  next: PointResult[],
  nextMarks: number,
): Comparison {
  if (prev.rubricId !== rubricId || prev.rubricVersion !== rubricVersion) throw new VersionMismatchError();

  const before = new Map(prev.points.map((p) => [p.pointId, p]));
  const recovered: PointChange[] = [];
  const improved: PointChange[] = [];
  const lost: PointChange[] = [];
  const stillMissing: PointChange[] = [];

  for (const n of next) {
    const b = before.get(n.pointId);
    if (!b) continue;
    const ch: PointChange = { pointId: n.pointId, label: n.label, from: b.aiMarks, to: n.aiMarks, allocated: n.allocated };
    if (n.aiMarks > b.aiMarks) (b.aiMarks === 0 ? recovered : improved).push(ch);
    else if (n.aiMarks < b.aiMarks) lost.push(ch);
    else if (n.aiMarks === 0) stillMissing.push(ch);
  }

  const parts: string[] = [`Marks went from ${prev.estimatedMarks} to ${nextMarks}.`];
  if (recovered.length) parts.push(`Recovered ${recovered.length} point(s): ${recovered.map((c) => c.label).join("; ")}.`);
  if (improved.length) parts.push(`Improved ${improved.length} point(s): ${improved.map((c) => c.label).join("; ")}.`);
  if (lost.length) parts.push(`Lost marks on ${lost.length} point(s): ${lost.map((c) => c.label).join("; ")}.`);
  if (stillMissing.length) parts.push(`Still missing ${stillMissing.length} point(s): ${stillMissing.map((c) => c.label).join("; ")}.`);
  if (!recovered.length && !improved.length && !lost.length) parts.push("No marking point changed. Extra length alone earns nothing.");

  return {
    recovered,
    improved,
    lost,
    stillMissing,
    marksBefore: prev.estimatedMarks,
    marksAfter: nextMarks,
    summary: parts.join(" "),
  };
}
