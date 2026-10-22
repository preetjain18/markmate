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

type Weighted = { stem: string; word: string; weight: number };

const pointStems = (p: RubricPoint) => new Set([...keyTokens(p.description), ...p.keywords.flatMap(keyTokens)]);

/** How many marking points of the rubric use each term. Terms shared by many points say little about any one. */
function docFreq(rubric: Rubric): Map<string, number> {
  const df = new Map<string, number>();
  for (const p of rubric.points) for (const s of pointStems(p)) df.set(s, (df.get(s) ?? 0) + 1);
  return df;
}

function pointTerms(p: RubricPoint, df: Map<string, number>): Weighted[] {
  const map = new Map<string, Weighted>();
  const add = (text: string, base: number) => {
    for (const w of words(text).filter((x) => x.length >= 5 && !STOP.has(x))) {
      const s = stem(w);
      const n = df.get(s) ?? 1;
      const weight = base * (n >= 3 ? 0.25 : n === 2 ? 0.6 : 1);
      if ((map.get(s)?.weight ?? 0) < weight) map.set(s, { stem: s, word: w, weight });
    }
  };
  add(p.description, 1);
  for (const k of p.keywords) add(k, 3);
  return [...map.values()];
}

function judgePoint(p: RubricPoint, df: Map<string, number>, answer: string, sentences: string[]): ModelOutput["points"][number] {
  const terms = pointTerms(p, df);
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

  if (!best || bestScore < 2 || ratio < 0.15) {
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
    reason: `You touched this point but left parts out${
      missing.length
        ? " (missing ideas around: " + [...missing].sort((a, b) => b.weight - a.weight).slice(0, 4).map((m) => m.word).join(", ") + ")"
        : ""
    }.`,
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
  const df = docFreq(rubric);
  return {
    points: rubric.points.map((p) => judgePoint(p, df, answer, sentences)),
    presentationTips: presentationTips(answer),
  };
}
