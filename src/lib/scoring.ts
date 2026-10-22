import { quoteInAnswer } from "./evidence";
import type { ModelOutput, PointResult, Rubric, Status } from "./schema";

export const roundHalf = (n: number) => Math.round(n * 2) / 2;

export function clampMarks(m: number, allocated: number): number {
  if (!Number.isFinite(m)) return 0;
  return Math.min(allocated, Math.max(0, roundHalf(m)));
}

const NEEDS_QUOTE: Status[] = ["correct_complete", "correct_incomplete", "incorrect"];

/**
 * Code decides the numbers. The model only proposes a status and marks per point;
 * unknown ids are ignored, duplicates after the first are dropped, and every judgement
 * that needs evidence must quote the student's answer word for word.
 */
export function scorePoints(rubric: Rubric, answer: string, output: ModelOutput): PointResult[] {
  const byId = new Map<string, ModelOutput["points"][number]>();
  for (const p of output.points) if (!byId.has(p.pointId)) byId.set(p.pointId, p);

  return rubric.points.map((rp): PointResult => {
    const m = byId.get(rp.id);
    const base = {
      pointId: rp.id,
      label: rp.label,
      allocated: rp.marks,
    };
    if (!m) {
      return {
        ...base,
        aiStatus: "uncertain",
        aiMarks: 0,
        evidenceQuote: "",
        evidenceVerified: false,
        needsReview: true,
        reviewReason: "The AI gave no judgement for this point.",
        reason: "",
        toRecover: rp.description,
      };
    }

    const quote = m.evidenceQuote.trim();
    const verified = quote !== "" && quoteInAnswer(quote, answer);

    if (NEEDS_QUOTE.includes(m.status) && !verified) {
      return {
        ...base,
        aiStatus: "uncertain",
        aiMarks: 0,
        evidenceQuote: quote,
        evidenceVerified: false,
        needsReview: true,
        reviewReason: "The quote the AI gave was not found word for word in your answer.",
        reason: m.reason,
        toRecover: m.toRecover || rp.description,
      };
    }

    let marks = 0;
    let review = false;
    let reviewReason = "";
    switch (m.status) {
      case "correct_complete":
        marks = rp.marks;
        break;
      case "correct_incomplete": {
        marks = Math.min(clampMarks(m.marks, rp.marks), Math.max(0, rp.marks - 0.5));
        if (marks <= 0) {
          review = true;
          reviewReason = "Status and marks disagree.";
        }
        break;
      }
      case "uncertain":
        review = true;
        reviewReason = "The AI was not sure about this point.";
        break;
      default:
        marks = 0;
    }

    return {
      ...base,
      aiStatus: m.status,
      aiMarks: marks,
      evidenceQuote: NEEDS_QUOTE.includes(m.status) ? quote : "",
      evidenceVerified: NEEDS_QUOTE.includes(m.status) ? verified : false,
      needsReview: review,
      reviewReason,
      reason: m.reason,
      toRecover: marks >= rp.marks ? "" : m.toRecover || rp.description,
    };
  });
}

export function totals(rubric: Rubric, points: PointResult[]) {
  const sum = points.reduce((s, p) => s + p.aiMarks, 0);
  const pending = points.filter((p) => p.needsReview).reduce((s, p) => s + p.allocated, 0);
  return {
    estimatedMarks: Math.min(rubric.maxMarks, sum),
    pendingReviewMarks: pending,
    needsReview: points.some((p) => p.needsReview),
  };
}
