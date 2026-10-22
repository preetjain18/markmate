import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AttemptResult } from "./schema";

/**
 * Faculty-validation log, kept inside the app (no external service).
 * One JSON line per attempt and per marking point. Faculty columns start empty.
 * On Vercel the project folder is read-only, so logs go to the temp folder there.
 */
export const LOG_DIR = process.env.VERCEL ? path.join(os.tmpdir(), "markmate-logs") : path.join(process.cwd(), "data", "logs");
export const ATTEMPTS_FILE = path.join(LOG_DIR, "attempts.jsonl");
export const POINTS_FILE = path.join(LOG_DIR, "points.jsonl");

export function logAttempt(args: {
  result: AttemptResult;
  sessionId: string;
  attemptNo: number;
  questionId: string;
  answerText: string;
}): void {
  try {
    const { result: r } = args;
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const attempt = {
      attemptId: r.attemptId,
      sessionId: args.sessionId,
      attemptNo: args.attemptNo,
      questionId: args.questionId,
      rubricVersion: r.rubricVersion,
      verified: r.verified,
      maxMarks: r.maxMarks,
      estimatedMarks: r.estimatedMarks,
      pendingReviewMarks: r.pendingReviewMarks,
      needsReview: r.needsReview,
      answerText: args.answerText,
      model: r.model,
      createdAt: r.createdAt,
    };
    fs.appendFileSync(ATTEMPTS_FILE, JSON.stringify(attempt) + "\n");
    const rows = r.points.map((p) => ({
      attemptId: r.attemptId,
      questionId: args.questionId,
      rubricVersion: r.rubricVersion,
      pointId: p.pointId,
      pointLabel: p.label,
      allocated: p.allocated,
      aiStatus: p.aiStatus,
      aiMarks: p.aiMarks,
      evidenceVerified: p.evidenceVerified,
      needsReview: p.needsReview,
      reviewReason: p.reviewReason,
      facultyMarks: "",
      reviewStatus: "pending",
      facultyNotes: "",
    }));
    fs.appendFileSync(POINTS_FILE, rows.map((x) => JSON.stringify(x)).join("\n") + "\n");
  } catch {
    // Logging must never break marking.
  }
}

export function readJsonl(file: string): Record<string, unknown>[] {
  try {
    return fs
      .readFileSync(file, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}
