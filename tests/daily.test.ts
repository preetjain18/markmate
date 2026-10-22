import { describe, expect, it } from "vitest";
import { loadCatalog } from "@/lib/catalog";
import { dateKey, didQuestionToday, practiceStreak, questionOfDay } from "@/lib/daily";
import type { HistoryRecord } from "@/lib/history";

const qs = loadCatalog().view.questions;

const rec = (iso: string, opts: Partial<HistoryRecord> = {}): HistoryRecord => ({
  v: 1, id: iso, createdAt: iso, status: "evaluated", questionId: "sa-570-going-concern", questionTitle: "t",
  levelId: "final", subjectId: "final-audit", chapterId: "sa-500-series", topicId: "sa-570", attemptNo: 1, firstAttemptId: null,
  rubricId: "sa-570-going-concern", rubricVersion: "1", maxMarks: 5, marks: 2, aiUsed: true, points: [], change: null, error: null, ...opts,
});
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).toISOString();

describe("question of the day", () => {
  it("is the same all day, changes between days, and is always evaluable", () => {
    const a = questionOfDay(qs, "2026-10-22");
    expect(questionOfDay(qs, "2026-10-22")).toEqual(a);
    const week = new Set(["2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28"].map((d) => questionOfDay(qs, d)!.id));
    expect(week.size).toBeGreaterThan(1);
    expect(a!.support).not.toBe("none");
  });

  it("stays within the student's level when one is chosen", () => {
    for (const day of ["2026-01-01", "2026-05-17", "2026-10-22"]) expect(questionOfDay(qs, day, "foundation")!.levelId).toBe("foundation");
  });
});

describe("practice streak", () => {
  const today = new Date(2026, 9, 22, 18);
  it("counts consecutive days ending today", () => {
    const h = [rec(at(2026, 10, 20)), rec(at(2026, 10, 21)), rec(at(2026, 10, 22, 9))];
    expect(practiceStreak(h, today)).toEqual({ days: 3, practisedToday: true });
  });
  it("keeps a streak alive that ended yesterday", () => {
    expect(practiceStreak([rec(at(2026, 10, 20)), rec(at(2026, 10, 21))], today)).toEqual({ days: 2, practisedToday: false });
  });
  it("resets after a missed day, and ignores failed evaluations", () => {
    expect(practiceStreak([rec(at(2026, 10, 19)), rec(at(2026, 10, 22, 9), { status: "failed" })], today)).toEqual({ days: 0, practisedToday: false });
  });
  it("knows whether today's question was done today", () => {
    expect(didQuestionToday([rec(at(2026, 10, 22, 9))], "sa-570-going-concern", today)).toBe(true);
    expect(didQuestionToday([rec(at(2026, 10, 21))], "sa-570-going-concern", today)).toBe(false);
    expect(dateKey(today)).toBe("2026-10-22");
  });
});
