/**
 * Local rule-based marker. No AI model and no network calls.
 * For each marking point it looks for the rubric's keywords and key terms in the student's answer,
 * quotes the best matching sentence word for word, and proposes a status and marks.
 * scorePoints() then verifies the quote and clamps the marks, exactly as before.
 */
import type { ModelOutput, Rubric, RubricPoint } from "./schema";
import { normalise } from "./evidence";
import { roundHalf } from "./scoring";

export const MARKER_NAME = "Local rule-based marker";

const STOP = new Set(
  ("about above after again against because before being below between both could during each further have having "
    + "their there these those through under until where which while would should shall other under into than then "
    + "such only same also when what with from this that them they will been does done make made must more most some "
    + "each very upon over onto per via any all and are for the not but can may has had was were its out one two").split(" "),
);

const stem = (w: string) => w.toLowerCase().replace(/(ing|ed|es|s|ly)$/, "").slice(0, 7);
const words = (s: string) => s.toLowerCase().match(/[a-z]{3,}/g) ?? [];
const keyTokens = (s: string) => [...new Set(words(s).filter((w) => w.length >= 5 && !STOP.has(w)).map(stem))];

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?;])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8);
}

type Weighted = { stem: string; weight: number };

function pointTerms(p: RubricPoint): Weighted[] {
  const map = new Map<string, number>();
  for (const t of keyTokens(p.description)) map.set(t, 1);
  for (const k of p.keywords) for (const t of keyTokens(k)) map.set(t, 3);
  return [...map].map(([stem, weight]) => ({ stem, weight }));
}

function judgePoint(p: RubricPoint, answer: string, sentences: string[]): ModelOutput["points"][number] {
  const terms = pointTerms(p);
  const answerStems = new Set(words(answer).map(stem));
  const total = terms.reduce((s, t) => s + t.weight, 0) || 1;
  const hit = terms.filter((t) => answerStems.has(t.stem));
  const ratio = hit.reduce((s, t) => s + t.weight, 0) / total;
  const missing = terms.filter((t) => !answerStems.has(t.stem));

  const phrases = p.keywords.filter((k) => normalise(answer).includes(normalise(k)));
  const missingPhrases = p.keywords.filter((k) => !phrases.includes(k));

  // Best sentence = the one matching the most of this point's terms; exact keyword phrases count most.
  let best = "";
  let bestScore = 0;
  for (const s of sentences) {
    const st = new Set(words(s).map(stem));
    const ns = normalise(s);
    const score =
      terms.reduce((n, t) => n + (st.has(t.stem) ? t.weight : 0), 0) +
      p.keywords.reduce((n, k) => n + (ns.includes(normalise(k)) ? 6 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }

  const recover = missingPhrases.length
    ? `Cover this point fully. Use the terms: ${missingPhrases.join(", ")}. ${p.description}`
    : `Cover this point fully. ${p.description}`;

  if (!best || bestScore < 2 || ratio < 0.12) {
    return { pointId: p.id, status: "not_addressed", marks: 0, evidenceQuote: "", reason: "Your answer does not cover this point.", toRecover: recover };
  }
  if (ratio >= 0.5 || (phrases.length >= Math.max(1, Math.ceil(p.keywords.length / 2)) && ratio >= 0.35)) {
    return { pointId: p.id, status: "correct_complete", marks: p.marks, evidenceQuote: best, reason: "", toRecover: "" };
  }
  return {
    pointId: p.id,
    status: "correct_incomplete",
    marks: Math.max(0.5, roundHalf(p.marks * ratio * 1.6)),
    evidenceQuote: best,
    reason: `You touched this point but left parts out${missing.length ? " (missing ideas around: " + missing.slice(0, 4).map((m) => m.stem).join(", ") + ")" : ""}.`,
    toRecover: recover,
  };
}

function presentationTips(answer: string): string[] {
  const tips: string[] = [];
  if (!/\n/.test(answer.trim())) tips.push("Break the answer into short paragraphs or numbered points so each marking point is easy to find.");
  if (!/\bSA[\s-]?\d{3}\b/i.test(answer)) tips.push("Quote the relevant Standard on Auditing (for example SA 570) where it applies.");
  if (answer.trim().split(/\s+/).length < 60) tips.push("Add a little more detail. Short answers usually miss marking points.");
  return tips.slice(0, 3);
}

export function localMark(rubric: Rubric, answer: string): ModelOutput {
  const sentences = splitSentences(answer);
  return {
    points: rubric.points.map((p) => judgePoint(p, answer, sentences)),
    presentationTips: presentationTips(answer),
  };
}
