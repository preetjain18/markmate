import { OUTCOME_OF, type Outcome } from "./insights";
import type { AttemptResult, Comparison, PointChange, PointResult, PreviousAttempt } from "./schema";

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

/* ------------------------- Point-by-point transitions ------------------------- */

/** How one marking point changed between attempts. */
export type Change = "newly-covered" | "improved" | "kept" | "still-missing" | "worse" | "unclear";

export type AttemptSide = {
  outcome: Outcome;
  marks: number;
  /** Only a quote verified word for word against that attempt's own answer; otherwise null. */
  quote: string | null;
};

export type TransitionRow = { pointId: string; label: string; allocated: number; before: AttemptSide; after: AttemptSide; change: Change };

export type AttemptComparison =
  | {
      ok: true;
      marksBefore: number;
      marksAfter: number;
      maxMarks: number;
      delta: number;
      direction: "up" | "down" | "same";
      rows: TransitionRow[];
      groups: Record<Change, TransitionRow[]>;
      /** True when one attempt was marked by the AI and the other by the rule-based fallback. */
      mixedMarkers: boolean;
    }
  | { ok: false; reason: string };

const side = (p: PointResult): AttemptSide => ({
  outcome: OUTCOME_OF[p.aiStatus],
  marks: p.aiMarks,
  quote: p.evidenceVerified && p.evidenceQuote.trim() ? p.evidenceQuote : null,
});

function classify(b: AttemptSide, a: AttemptSide): Change {
  // A point held for review has no reliable judgement, so no change is claimed either way.
  if (a.outcome === "review" || b.outcome === "review") return "unclear";
  if (a.marks > b.marks) return a.outcome === "covered" ? "newly-covered" : "improved";
  if (a.marks < b.marks) return "worse";
  if (a.outcome === "covered") return "kept";
  // Same marks, not covered: a newly wrong statement is still a step back.
  if (a.outcome === "contradicted" && b.outcome !== "contradicted") return "worse";
  return "still-missing";
}

/**
 * Compares two validated results for the same question and rubric version.
 * Reuses compareAttempts for the version check and mark movements; adds statuses and evidence per point.
 * Refuses (ok: false) instead of comparing results that don't share the same marking points.
 */
export function compareResults(first: AttemptResult, second: AttemptResult): AttemptComparison {
  try {
    compareAttempts(first, second.rubricId, second.rubricVersion, second.points, second.estimatedMarks);
  } catch (e) {
    if (e instanceof VersionMismatchError) return { ok: false, reason: "These attempts were marked against different questions or marking-scheme versions, so they can't be compared." };
    throw e;
  }
  const ids = (r: AttemptResult) => r.points.map((p) => `${p.pointId}:${p.allocated}`).join("|");
  if (ids(first) !== ids(second) || first.maxMarks !== second.maxMarks) {
    return { ok: false, reason: "The two attempts don't share the same marking points, so a point-by-point comparison would be misleading." };
  }

  const rows: TransitionRow[] = second.points.map((n, i) => {
    const b = side(first.points[i]);
    const a = side(n);
    return { pointId: n.pointId, label: n.label, allocated: n.allocated, before: b, after: a, change: classify(b, a) };
  });
  const groups = { "newly-covered": [], improved: [], kept: [], "still-missing": [], worse: [], unclear: [] } as Record<Change, TransitionRow[]>;
  for (const r of rows) groups[r.change].push(r);
  // Marks move in half steps; rounding avoids floating-point noise such as 0.30000000000000004.
  const delta = Math.round((second.estimatedMarks - first.estimatedMarks) * 2) / 2;

  return {
    ok: true,
    marksBefore: first.estimatedMarks,
    marksAfter: second.estimatedMarks,
    maxMarks: second.maxMarks,
    delta,
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "same",
    rows,
    groups,
    mixedMarkers: first.aiUsed !== second.aiUsed,
  };
}
