import { beforeEach, describe, expect, it } from "vitest";
import { buildCatalog, loadCatalog } from "@/lib/catalog";
import { evaluate } from "@/lib/evaluate";
import { appendHistory, failedRecord, HISTORY_KEY, loadHistory, recordFromResult, type HistoryRecord } from "@/lib/history";
import { byChapter, bySubject, practiceHref, recommend, summarize, trend } from "@/lib/progress";
import { loadRubrics } from "@/lib/rubrics";

const catalog = loadCatalog().view;
const audit = catalog.levels.find((l) => l.id === "final")!.subjects.find((s) => s.id === "final-audit")!;
const q = (id: string) => catalog.questions.find((x) => x.id === id)!;

let n = 0;
function rec(questionId: string | null, marks: number, opts: Partial<HistoryRecord> = {}): HistoryRecord {
  const qv = questionId ? q(questionId) : null;
  return {
    v: 1,
    id: `r${++n}`,
    createdAt: new Date(Date.UTC(2026, 9, 1, 10, n)).toISOString(),
    status: "evaluated",
    questionId,
    questionTitle: qv?.title ?? "Own question",
    levelId: qv?.levelId ?? null,
    subjectId: qv?.subjectId ?? null,
    chapterId: qv?.chapterId ?? null,
    topicId: qv?.topicId ?? null,
    attemptNo: 1,
    firstAttemptId: null,
    rubricId: questionId ?? "custom-x",
    rubricVersion: "1",
    maxMarks: 5,
    marks,
    aiUsed: true,
    points: [],
    change: null,
    error: null,
    ...opts,
  };
}
const meta = (id: string) => ({ questionId: id, questionTitle: q(id).title, levelId: "final", subjectId: "final-audit", chapterId: q(id).chapterId, topicId: q(id).topicId });

describe("progress with no attempts", () => {
  it("shows zeros and nulls, never invented numbers", () => {
    const s = summarize([]);
    expect(s).toMatchObject({ questionsAttempted: 0, evaluations: 0, failed: 0, averageFirstAttemptPct: null, pointsImproved: null });
    expect(bySubject([], catalog).practised).toEqual([]);
    expect(trend([]).enough).toBe(false);
  });

  it("recommends a first question with a working practice link", () => {
    const r = recommend([], catalog);
    expect(r[0].kind).toBe("first");
    expect(practiceHref(r[0].link)).toMatch(/^\/practice\?level=\w+&subject=[\w-]+&chapter=.+&question=.+/);
    expect(q(r[0].link.question!).support).not.toBe("none");
  });
});

describe("summary", () => {
  it("separates completed evaluations from failed ones", () => {
    const h = [rec("sa-570-going-concern", 2), failedRecord(meta("sa-230-audit-documentation"), 1, null, "offline")];
    const s = summarize(h);
    expect(s.evaluations).toBe(1);
    expect(s.failed).toBe(1);
    expect(s.questionsAttempted).toBe(2);
    expect(s.averageFirstAttemptPct).toBe(40);
  });

  it("averages first attempts only, as a percentage of each question's own maximum", () => {
    const a1 = rec("sa-570-going-concern", 2);
    const h = [
      a1,
      rec("sa-570-going-concern", 5, { attemptNo: 2, firstAttemptId: a1.id, change: { recovered: 2, improved: 1, lost: 0, marksBefore: 2 } }),
      rec(null, 4, { maxMarks: 10 }), // own question on a 10-mark scale: 40%
    ];
    expect(summarize(h).averageFirstAttemptPct).toBe(40);
  });

  it("counts improved points from the latest rewrite per Attempt 1 only", () => {
    const a1 = rec("sa-570-going-concern", 1);
    const h = [
      a1,
      rec("sa-570-going-concern", 2, { attemptNo: 2, firstAttemptId: a1.id, change: { recovered: 1, improved: 0, lost: 0, marksBefore: 1 } }),
      rec("sa-570-going-concern", 3, { attemptNo: 3, firstAttemptId: a1.id, change: { recovered: 2, improved: 0, lost: 0, marksBefore: 1 } }),
    ];
    expect(summarize(h).pointsImproved).toBe(2);
    expect(summarize(h).rewrites).toBe(2);
  });
});

describe("subjects and chapters", () => {
  it("lists only real practice; untried evaluable subjects are 'not practised', never zero", () => {
    const { practised, notPractised } = bySubject([rec("sa-570-going-concern", 3)], catalog);
    expect(practised.map((p) => p.subject.id)).toEqual(["final-audit"]);
    expect(practised[0].averagePct).toBe(60);
    expect(practised[0].tag).toBeNull(); // one subject: no strongest/weakest
    // every other paper has questions now: listed as not practised, with no score at all
    expect(notPractised).toHaveLength(15);
    expect(notPractised.map((n) => n.subject.id)).not.toContain("final-audit");
  });

  it("names strongest and weakest only when two subjects each have enough evaluated questions", () => {
    const base = loadRubrics()[0];
    const clone = (id: string) => ({ ...base, id });
    const fixture = buildCatalog(
      {
        source: "test",
        levels: [
          {
            id: "inter",
            name: "CA Intermediate",
            subjects: ["s1", "s2"].map((s) => ({
              id: s,
              name: s.toUpperCase(),
              category: "audit",
              chapters: [{ id: `${s}-c`, name: "Chapter", topics: [{ id: `${s}-t`, name: "Topic", questions: [`${s}-q1`, `${s}-q2`] }] }],
            })),
          },
        ],
      },
      ["s1-q1", "s1-q2", "s2-q1", "s2-q2"].map(clone),
    ).view;
    const r = (qid: string, marks: number): HistoryRecord => ({ ...rec(null, marks), questionId: qid, subjectId: qid.slice(0, 2), chapterId: `${qid.slice(0, 2)}-c`, maxMarks: base.maxMarks });
    const oneEach = bySubject([r("s1-q1", 5), r("s2-q1", 1)], fixture).practised;
    expect(oneEach.every((s) => s.tag === null)).toBe(true); // one question each is not enough to judge
    const enough = bySubject([r("s1-q1", 5), r("s1-q2", 4), r("s2-q1", 1), r("s2-q2", 2)], fixture).practised;
    expect(enough.find((s) => s.subject.id === "s1")!.tag).toBe("strongest");
    expect(enough.find((s) => s.subject.id === "s2")!.tag).toBe("weakest");
  });

  it("marks chapters with one evaluated question as limited data", () => {
    const chapters = byChapter([rec("sa-570-going-concern", 3)], audit);
    const evidence = chapters.find((c) => c.chapter.id === "sa-500-series")!;
    expect(evidence.questionsEvaluated).toBe(1);
    expect(evidence.limited).toBe(true);
    expect(chapters.find((c) => c.chapter.id === "sa-300-series")!.averagePct).toBeNull();
  });

  it("finds a marking point missed in two evaluations", () => {
    const pts = (o: "missed" | "covered") => [{ pointId: "p3", label: "Evaluating management's plans", allocated: 1, marks: 0, outcome: o }];
    const h = [rec("sa-570-going-concern", 2, { points: pts("missed") }), rec("sa-570-going-concern", 2, { points: pts("missed") })];
    const ch = byChapter(h, audit).find((c) => c.chapter.id === "sa-500-series")!;
    expect(ch.repeatedGaps).toEqual([{ label: "Evaluating management's plans", times: 2, questionId: "sa-570-going-concern" }]);
  });
});

describe("trend", () => {
  it("needs three dated evaluations and skips bad dates and failures", () => {
    const h = [rec("sa-570-going-concern", 1), rec("sa-230-audit-documentation", 2), rec("sa-240-fraud", 3, { createdAt: "not a date" })];
    expect(trend(h).enough).toBe(false);
    expect(trend([...h, rec("sa-505-external-confirmations", 4), failedRecord(meta("sa-530-audit-sampling"), 1, null, "x")]).points.map((p) => p.pct)).toEqual([20, 40, 80]);
  });
});

describe("recommendations", () => {
  it("suggests a rewrite for a weak, unrewritten answer, and stops once rewritten", () => {
    const a1 = rec("sa-570-going-concern", 1);
    expect(recommend([a1], catalog)[0]).toMatchObject({ kind: "rewrite", link: { question: "sa-570-going-concern" } });
    const after = recommend([a1, rec("sa-570-going-concern", 2, { attemptNo: 2, firstAttemptId: a1.id })], catalog);
    expect(after.some((r) => r.kind === "rewrite")).toBe(false);
  });

  it("falls back to untried chapters with available questions", () => {
    const r = recommend([rec("sa-570-going-concern", 5)], catalog);
    expect(r.every((x) => x.kind === "unpractised")).toBe(true);
    expect(r.map((x) => x.link.chapter)).not.toContain("sa-300-series"); // no questions there
  });
});

describe("browser history store", () => {
  const mem = new Map<string, string>();
  beforeEach(() => {
    mem.clear();
    globalThis.localStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    } as unknown as Storage;
  });

  it("stores validated results without recomputing them, and keeps unreadable entries untouched", async () => {
    const rubric = loadRubrics().find((r) => r.id === "sa-570-going-concern")!;
    const result = await evaluate({ rubric, answer: "Management prepares the financial statements on the going concern basis." });
    mem.set(HISTORY_KEY, JSON.stringify([{ junk: true }]));
    appendHistory(recordFromResult(result, meta("sa-570-going-concern"), 1, null));
    const h = loadHistory();
    expect(h).toHaveLength(1);
    expect(h[0].marks).toBe(result.estimatedMarks);
    expect(h[0].points.map((p) => p.marks)).toEqual(result.points.map((p) => p.aiMarks));
    expect(JSON.parse(mem.get(HISTORY_KEY)!)).toHaveLength(2); // the junk entry was not silently deleted
  });
});
