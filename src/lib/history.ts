/**
 * Practice history, kept in this browser's localStorage (no account, no server database).
 *
 * What is stored, per evaluation attempt: when it happened, which question (and its level, subject,
 * chapter, topic), the rubric id and version, the attempt number, marks and maximum marks, whether the
 * AI or the rule-based fallback marked it, each marking point's outcome and marks, and for rewrites the
 * code-computed comparison counts. Failed evaluations are stored with their error message and no score.
 * Answer text is NOT stored here (drafts are stored separately, per question).
 *
 * Limits: it lives in one browser on one device; clearing site data, private windows or another
 * device start empty. Nothing is sent anywhere.
 */
import { z } from "zod";
import { OUTCOME_OF } from "./insights";
import type { AttemptResult } from "./schema";

export const HISTORY_KEY = "markmate-history-v1";
/** Very large safety cap; only the oldest records beyond it are dropped. */
export const HISTORY_CAP = 2000;

const OutcomeSchema = z.enum(["covered", "partial", "missed", "contradicted", "review"]);

export const HistoryRecordSchema = z.object({
  v: z.literal(1),
  id: z.string(),
  createdAt: z.string(),
  status: z.enum(["evaluated", "failed"]),
  /** null for "your own question" attempts, which have no catalog entry. */
  questionId: z.string().nullable(),
  questionTitle: z.string(),
  levelId: z.string().nullable(),
  subjectId: z.string().nullable(),
  chapterId: z.string().nullable(),
  topicId: z.string().nullable(),
  attemptNo: z.number().int().min(1),
  /** For rewrites: the id of the Attempt 1 record they were compared with. */
  firstAttemptId: z.string().nullable(),
  rubricId: z.string().nullable(),
  rubricVersion: z.string().nullable(),
  maxMarks: z.number().positive().nullable(),
  marks: z.number().min(0).nullable(),
  aiUsed: z.boolean().nullable(),
  points: z
    .array(z.object({ pointId: z.string(), label: z.string(), allocated: z.number(), marks: z.number(), outcome: OutcomeSchema }))
    .default([]),
  change: z.object({ recovered: z.number(), improved: z.number(), lost: z.number(), marksBefore: z.number() }).nullable(),
  error: z.string().nullable(),
});
export type HistoryRecord = z.infer<typeof HistoryRecordSchema>;

export type QuestionMeta = {
  questionId: string | null;
  questionTitle: string;
  levelId: string | null;
  subjectId: string | null;
  chapterId: string | null;
  topicId: string | null;
};

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `id-${Date.now()}-${Math.random()}`);

/** Builds a record from a validated evaluation result. No numbers are recomputed. */
export function recordFromResult(result: AttemptResult, meta: QuestionMeta, attemptNo: number, firstAttemptId: string | null): HistoryRecord {
  return {
    v: 1,
    id: result.attemptId,
    createdAt: result.createdAt,
    status: "evaluated",
    ...meta,
    attemptNo,
    firstAttemptId,
    rubricId: result.rubricId,
    rubricVersion: result.rubricVersion,
    maxMarks: result.maxMarks,
    marks: result.estimatedMarks,
    aiUsed: result.aiUsed,
    points: result.points.map((p) => ({ pointId: p.pointId, label: p.label, allocated: p.allocated, marks: p.aiMarks, outcome: OUTCOME_OF[p.aiStatus] })),
    change: result.comparison
      ? {
          recovered: result.comparison.recovered.length,
          improved: result.comparison.improved.length,
          lost: result.comparison.lost.length,
          marksBefore: result.comparison.marksBefore,
        }
      : null,
    error: null,
  };
}

export function failedRecord(meta: QuestionMeta, attemptNo: number, firstAttemptId: string | null, error: string): HistoryRecord {
  return {
    v: 1,
    id: newId(),
    createdAt: new Date().toISOString(),
    status: "failed",
    ...meta,
    attemptNo,
    firstAttemptId,
    rubricId: null,
    rubricVersion: null,
    maxMarks: null,
    marks: null,
    aiUsed: null,
    points: [],
    change: null,
    error,
  };
}

function readRaw(): unknown[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Valid records only. Entries that fail validation are skipped when reading but left in storage untouched. */
export function loadHistory(): HistoryRecord[] {
  return readRaw().flatMap((x) => {
    const r = HistoryRecordSchema.safeParse(x);
    return r.success ? [r.data] : [];
  });
}

export function appendHistory(rec: HistoryRecord): void {
  try {
    const all = [...readRaw(), rec];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(all.slice(-HISTORY_CAP)));
  } catch {
    // Storage full or blocked: practice still works, it just isn't recorded.
  }
}

/** Only ever called after the student confirms. */
export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {}
}
