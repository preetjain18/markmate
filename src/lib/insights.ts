/**
 * Read-only summaries of a validated evaluation result for the Lost Marks Map.
 * Everything here is computed from the result itself: no new scores, no model calls.
 */
import type { AttemptResult, PointResult, Status } from "./schema";

/** The five outcomes a marking point can have, as students see them. */
export type Outcome = "covered" | "partial" | "missed" | "contradicted" | "review";

export const OUTCOME_OF: Record<Status, Outcome> = {
  correct_complete: "covered",
  correct_incomplete: "partial",
  not_addressed: "missed",
  incorrect: "contradicted",
  uncertain: "review",
};

export type OutcomeCounts = Record<Outcome, number>;

export function countOutcomes(points: PointResult[]): OutcomeCounts {
  const c: OutcomeCounts = { covered: 0, partial: 0, missed: 0, contradicted: 0, review: 0 };
  for (const p of points) c[OUTCOME_OF[p.aiStatus]]++;
  return c;
}

export type Priority = {
  pointId: string;
  label: string;
  outcome: Exclude<Outcome, "covered" | "review">;
  marksAtStake: number;
  action: string;
  requirement: string;
};

// Wrong statements are fixed first (they can cost credibility), then missed points, then partial ones.
const RANK: Record<Priority["outcome"], number> = { contradicted: 0, missed: 1, partial: 2 };

/**
 * Up to `limit` actions that would recover the most marks. Points held for review are left out,
 * because we don't know yet whether marks were really lost there.
 */
export function topPriorities(points: PointResult[], limit = 3): Priority[] {
  return points
    .filter((p) => p.aiMarks < p.allocated && OUTCOME_OF[p.aiStatus] !== "review")
    .map((p) => ({
      pointId: p.pointId,
      label: p.label,
      outcome: OUTCOME_OF[p.aiStatus] as Priority["outcome"],
      marksAtStake: p.allocated - p.aiMarks,
      action: p.toRecover || p.requirement,
      requirement: p.requirement,
    }))
    .sort((a, b) => b.marksAtStake - a.marksAtStake || RANK[a.outcome] - RANK[b.outcome])
    .slice(0, limit);
}

/** One or two plain sentences: how many points were covered, and the single biggest gap. */
export function overallAssessment(result: AttemptResult): string {
  const n = result.points.length;
  const c = countOutcomes(result.points);
  if (c.covered === n) return "You covered every marking point. Check the wording and presentation tips below to keep it exam-ready.";
  const parts = [`You fully covered ${c.covered} of ${n} marking point${n === 1 ? "" : "s"}`];
  if (c.partial) parts.push(`partly covered ${c.partial}`);
  if (c.missed) parts.push(`missed ${c.missed}`);
  if (c.contradicted) parts.push(`got ${c.contradicted} wrong`);
  let text = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}.` : `${parts[0]}.`;
  const top = topPriorities(result.points, 1)[0];
  if (top) text += ` Your biggest gap is “${top.label}”, worth ${fmtMarks(top.marksAtStake)}.`;
  if (c.review) text += ` ${c.review} point${c.review === 1 ? " is" : "s are"} held for review.`;
  return text;
}

const fmtMarks = (m: number) => `${Number.isInteger(m) ? m : m.toFixed(1)} mark${m === 1 ? "" : "s"}`;
