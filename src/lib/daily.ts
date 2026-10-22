/**
 * Question of the Day and practice streak. Pure functions: the daily question is chosen from the date
 * alone (same for everyone that day), and the streak is derived from recorded evaluations, so nothing
 * extra is stored.
 */
import type { QuestionView } from "./catalog-types";
import type { HistoryRecord } from "./history";

/** Local calendar date as YYYY-MM-DD. */
export function dateKey(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Picks one evaluable question for the day, optionally within a CA level. Stable for a given date. */
export function questionOfDay(questions: QuestionView[], day: string, levelId?: string | null): QuestionView | null {
  const pool = questions
    .filter((q) => q.support !== "none" && (!levelId || q.levelId === levelId))
    .sort((a, b) => a.id.localeCompare(b.id));
  if (!pool.length) return levelId ? questionOfDay(questions, day) : null;
  return pool[hash(`${day}:${levelId ?? "all"}`) % pool.length];
}

export type Streak = { days: number; practisedToday: boolean };

/**
 * Consecutive days, ending today or yesterday, with at least one completed evaluation.
 * A streak that ended yesterday is still alive until today is over.
 */
export function practiceStreak(history: HistoryRecord[], today: Date = new Date()): Streak {
  const days = new Set(
    history.filter((r) => r.status === "evaluated" && !Number.isNaN(Date.parse(r.createdAt))).map((r) => dateKey(new Date(r.createdAt))),
  );
  const practisedToday = days.has(dateKey(today));
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!practisedToday) cursor.setDate(cursor.getDate() - 1);
  let n = 0;
  while (days.has(dateKey(cursor))) {
    n++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { days: n, practisedToday };
}

/** True if today's question was evaluated today. */
export function didQuestionToday(history: HistoryRecord[], questionId: string, today: Date = new Date()): boolean {
  const k = dateKey(today);
  return history.some((r) => r.status === "evaluated" && r.questionId === questionId && dateKey(new Date(r.createdAt)) === k);
}
