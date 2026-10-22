/**
 * Progress dashboard maths. Pure functions over recorded history and the catalog: no new scores.
 *
 * Measure: each evaluation is expressed as a percentage of its own maximum marks, so questions with
 * different mark scales can be compared. "Average practice score" uses Attempt 1 only, so rewrites
 * of the same question don't inflate it.
 */
import type { CatalogView, ChapterView, LevelView, QuestionView, SubjectView } from "./catalog-types";
import type { HistoryRecord } from "./history";

/** Minimum evaluated questions before calling a subject strong/weak or a chapter well-understood. */
export const MIN_FOR_JUDGEMENT = 2;
/** Minimum dated evaluations before a trend chart is shown. */
export const MIN_FOR_TREND = 3;

export const pct = (r: HistoryRecord) => (r.marks !== null && r.maxMarks ? (r.marks / r.maxMarks) * 100 : null);
const evaluated = (h: HistoryRecord[]) => h.filter((r) => r.status === "evaluated" && pct(r) !== null);
const firstAttempts = (h: HistoryRecord[]) => evaluated(h).filter((r) => r.attemptNo === 1);
const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
const validDate = (r: HistoryRecord) => !Number.isNaN(Date.parse(r.createdAt));

/* --------------------------------- Summary -------------------------------- */

export type Summary = {
  questionsAttempted: number;
  evaluations: number;
  failed: number;
  firstAttempts: number;
  rewrites: number;
  averageFirstAttemptPct: number | null;
  /** Marking points that gained marks on a rewrite (latest rewrite per Attempt 1). null if no rewrites. */
  pointsImproved: number | null;
  ruleBasedEvaluations: number;
};

/** Latest rewrite per Attempt 1, so repeated rewrites of the same answer aren't double counted. */
export function latestRewrites(h: HistoryRecord[]): HistoryRecord[] {
  const byFirst = new Map<string, HistoryRecord>();
  for (const r of evaluated(h)) {
    if (r.attemptNo < 2 || !r.firstAttemptId || !r.change) continue;
    const prev = byFirst.get(r.firstAttemptId);
    if (!prev || r.attemptNo > prev.attemptNo) byFirst.set(r.firstAttemptId, r);
  }
  return [...byFirst.values()];
}

export function summarize(h: HistoryRecord[]): Summary {
  const ev = evaluated(h);
  const firsts = firstAttempts(h);
  const rewrites = latestRewrites(h);
  const qKey = (r: HistoryRecord) => r.questionId ?? `custom:${r.rubricId ?? r.id}`;
  return {
    questionsAttempted: new Set(h.map(qKey)).size,
    evaluations: ev.length,
    failed: h.filter((r) => r.status === "failed").length,
    firstAttempts: firsts.length,
    rewrites: ev.filter((r) => r.attemptNo > 1).length,
    averageFirstAttemptPct: mean(firsts.map((r) => pct(r)!)),
    pointsImproved: rewrites.length ? rewrites.reduce((s, r) => s + r.change!.recovered + r.change!.improved, 0) : null,
    ruleBasedEvaluations: ev.filter((r) => r.aiUsed === false).length,
  };
}

/* -------------------------------- Subjects -------------------------------- */

export type SubjectProgress = {
  subject: SubjectView;
  level: LevelView;
  questionsEvaluated: number;
  evaluations: number;
  averagePct: number | null;
  tag: "strongest" | "weakest" | null;
};

export function bySubject(h: HistoryRecord[], catalog: CatalogView): { practised: SubjectProgress[]; notPractised: { subject: SubjectView; level: LevelView }[] } {
  const firsts = firstAttempts(h);
  const practised: SubjectProgress[] = [];
  const notPractised: { subject: SubjectView; level: LevelView }[] = [];
  for (const level of catalog.levels) {
    for (const subject of level.subjects) {
      const mine = firsts.filter((r) => r.subjectId === subject.id);
      if (mine.length === 0) {
        if (subject.stats.evaluable > 0) notPractised.push({ subject, level });
        continue;
      }
      practised.push({
        subject,
        level,
        questionsEvaluated: new Set(mine.map((r) => r.questionId)).size,
        evaluations: evaluated(h).filter((r) => r.subjectId === subject.id).length,
        averagePct: mean(mine.map((r) => pct(r)!)),
        tag: null,
      });
    }
  }
  // Strongest/weakest only when at least two subjects each have enough evaluated questions.
  const judged = practised.filter((s) => s.questionsEvaluated >= MIN_FOR_JUDGEMENT && s.averagePct !== null);
  if (judged.length >= 2) {
    const sorted = [...judged].sort((a, b) => b.averagePct! - a.averagePct!);
    if (sorted[0].averagePct !== sorted[sorted.length - 1].averagePct) {
      sorted[0].tag = "strongest";
      sorted[sorted.length - 1].tag = "weakest";
    }
  }
  return { practised, notPractised };
}

/* -------------------------------- Chapters -------------------------------- */

export type RepeatedGap = { label: string; times: number; questionId: string | null };

export type ChapterProgress = {
  chapter: ChapterView;
  questionsAvailable: number;
  questionsEvaluated: number;
  evaluations: number;
  averagePct: number | null;
  limited: boolean;
  /** Same marking point missed, contradicted or only partly covered in 2+ evaluations. */
  repeatedGaps: RepeatedGap[];
};

export function byChapter(h: HistoryRecord[], subject: SubjectView): ChapterProgress[] {
  const ev = evaluated(h).filter((r) => r.subjectId === subject.id);
  return subject.chapters.map((chapter) => {
    const mine = ev.filter((r) => r.chapterId === chapter.id);
    const firsts = mine.filter((r) => r.attemptNo === 1);
    const gaps = new Map<string, RepeatedGap>();
    for (const r of mine)
      for (const p of r.points) {
        if (p.outcome === "covered" || p.outcome === "review") continue;
        const key = `${r.rubricId}:${p.pointId}`;
        const g = gaps.get(key) ?? { label: p.label, times: 0, questionId: r.questionId };
        g.times++;
        gaps.set(key, g);
      }
    return {
      chapter,
      questionsAvailable: chapter.count,
      questionsEvaluated: new Set(firsts.map((r) => r.questionId)).size,
      evaluations: mine.length,
      averagePct: mean(firsts.map((r) => pct(r)!)),
      limited: new Set(firsts.map((r) => r.questionId)).size < MIN_FOR_JUDGEMENT,
      repeatedGaps: [...gaps.values()].filter((g) => g.times >= 2).sort((a, b) => b.times - a.times),
    };
  });
}

/* ---------------------------------- Trend --------------------------------- */

export type TrendPoint = { id: string; date: string; pct: number; attemptNo: number; title: string };

export function trend(h: HistoryRecord[]): { points: TrendPoint[]; enough: boolean } {
  const points = evaluated(h)
    .filter(validDate)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .map((r) => ({ id: r.id, date: r.createdAt, pct: pct(r)!, attemptNo: r.attemptNo, title: r.questionTitle }));
  return { points, enough: points.length >= MIN_FOR_TREND };
}

/* ----------------------------- Recommendations ---------------------------- */

export type Link = { level?: string; subject?: string; chapter?: string; topic?: string; question?: string };
export type Recommendation = { kind: "rewrite" | "repeated-gap" | "partial-topic" | "unpractised" | "first"; title: string; why: string; action: string; link: Link };

export const practiceHref = (l: Link) => {
  const q = new URLSearchParams(Object.entries(l).filter(([, v]) => v) as [string, string][]);
  const s = q.toString();
  return s ? `/practice?${s}` : "/practice";
};

const linkFor = (q: QuestionView): Link => ({ level: q.levelId, subject: q.subjectId, chapter: q.chapterId, topic: q.topicId ?? undefined, question: q.id });

/**
 * Simple, transparent rules over real history, most useful first:
 * 1. A question whose best score is under 60% and that hasn't been rewritten yet.
 * 2. A chapter where the same marking point has been missed or partly covered 2+ times.
 * 3. A topic where answers were partly covered in 2+ evaluations.
 * 4. Chapters with questions you haven't tried yet (in subjects you practise, else any evaluable subject).
 * With no history at all: one suggested first question.
 */
export function recommend(h: HistoryRecord[], catalog: CatalogView, limit = 4): Recommendation[] {
  const qById = new Map(catalog.questions.map((q) => [q.id, q]));
  const subjects = new Map(catalog.levels.flatMap((l) => l.subjects.map((s) => [s.id, s] as const)));
  const ev = evaluated(h).filter((r) => r.questionId && qById.has(r.questionId));
  const out: Recommendation[] = [];
  const seen = new Set<string>();
  const add = (key: string, r: Recommendation) => {
    if (!seen.has(key) && out.length < limit) {
      seen.add(key);
      out.push(r);
    }
  };

  // 1. Rewrite candidates
  const byQuestion = new Map<string, HistoryRecord[]>();
  for (const r of ev) byQuestion.set(r.questionId!, [...(byQuestion.get(r.questionId!) ?? []), r]);
  const weak = [...byQuestion.entries()]
    .map(([qid, rs]) => ({ q: qById.get(qid)!, best: Math.max(...rs.map((r) => pct(r)!)), rewritten: rs.some((r) => r.attemptNo > 1) }))
    .filter((x) => x.best < 60 && !x.rewritten && x.q.support !== "none")
    .sort((a, b) => a.best - b.best);
  for (const w of weak)
    add(`q:${w.q.id}`, {
      kind: "rewrite",
      title: w.q.title,
      why: `Your best score here is ${Math.round(w.best)}%, and you haven't rewritten it yet. A rewrite is the fastest way to recover marks.`,
      action: "Practise this question again",
      link: linkFor(w.q),
    });

  // 2. Repeated gaps by chapter
  for (const s of subjects.values()) {
    if (!ev.some((r) => r.subjectId === s.id)) continue;
    for (const c of byChapter(h, s)) {
      const g = c.repeatedGaps[0];
      if (!g) continue;
      add(`c:${c.chapter.id}`, {
        kind: "repeated-gap",
        title: c.chapter.name,
        why: `“${g.label}” was missed or only partly covered ${g.times} times.`,
        action: "Practise this chapter",
        link: { level: catalog.questions.find((q) => q.chapterId === c.chapter.id)?.levelId, subject: s.id, chapter: c.chapter.id },
      });
    }
  }

  // 3. Topics with repeated partial answers
  const partialByTopic = new Map<string, number>();
  for (const r of ev) if (r.topicId && r.points.some((p) => p.outcome === "partial")) partialByTopic.set(r.topicId, (partialByTopic.get(r.topicId) ?? 0) + 1);
  for (const [topicId, n] of partialByTopic) {
    if (n < 2) continue;
    const q = catalog.questions.find((x) => x.topicId === topicId)!;
    add(`t:${topicId}`, {
      kind: "partial-topic",
      title: q.title,
      why: `Your answers here were partly correct in ${n} evaluations. Aim to cover each point completely.`,
      action: "Practise this topic",
      link: { level: q.levelId, subject: q.subjectId, chapter: q.chapterId, topic: topicId },
    });
  }

  // 4. Unpractised chapters with evaluable questions
  const tried = new Set(ev.map((r) => r.questionId));
  const practisedSubjects = new Set(ev.map((r) => r.subjectId));
  const candidates = catalog.levels.flatMap((l) =>
    l.subjects
      .filter((s) => s.stats.evaluable > 0)
      .sort((a, b) => Number(practisedSubjects.has(b.id)) - Number(practisedSubjects.has(a.id)))
      .flatMap((s) => s.chapters.map((c) => ({ l, s, c }))),
  );
  if (ev.length === 0) {
    const first = catalog.questions.find((q) => q.support !== "none");
    if (first)
      add(`first`, {
        kind: "first",
        title: first.title,
        why: "Start with one question. Your progress will appear here after your first evaluation.",
        action: "Try your first question",
        link: linkFor(first),
      });
  }
  for (const { l, s, c } of candidates) {
    const untried = catalog.questions.filter((q) => q.chapterId === c.id && q.subjectId === s.id && q.support !== "none" && !tried.has(q.id));
    if (!untried.length) continue;
    const any = ev.some((r) => r.chapterId === c.id);
    add(`c:${c.id}`, {
      kind: "unpractised",
      title: `${c.name}`,
      why: any
        ? `${untried.length} question${untried.length === 1 ? "" : "s"} in this chapter you haven't tried yet.`
        : `You haven't practised this chapter yet. ${untried.length} question${untried.length === 1 ? " is" : "s are"} available.`,
      action: "Open this chapter",
      link: { level: l.id, subject: s.id, chapter: c.id },
    });
  }
  return out;
}
