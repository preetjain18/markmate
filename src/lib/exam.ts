/**
 * Exam attempt analysis from published ICAI figures (data/exam-insights.json). Every number in that file
 * carries the URL of the page it was read from; this module only sorts, compares and labels them.
 * A pass rate reflects how candidates did in that attempt, so it is shown as "lower or higher pass rate",
 * never as a claim about how hard the paper itself was.
 */
import { z } from "zod";

export const LEVELS = ["foundation", "intermediate", "final"] as const;
export type ExamLevel = (typeof LEVELS)[number];

const Source = { sourceUrl: z.string().url(), sourceType: z.enum(["icai", "news", "secondary"]), sourceTitle: z.string().default("") };

export const PassRateSchema = z.object({
  level: z.enum(LEVELS),
  attempt: z.string().min(1),
  group: z.enum(["overall", "group1", "group2", "both"]),
  passPercent: z.number().min(0).max(100).nullable(),
  appeared: z.number().int().nonnegative().nullable().default(null),
  passed: z.number().int().nonnegative().nullable().default(null),
  ...Source,
});
export type PassRate = z.infer<typeof PassRateSchema>;

export const WeightItemSchema = z.object({
  name: z.string().min(1),
  min: z.number().nonnegative(),
  max: z.number().nonnegative(),
  text: z.string(),
  /** For papers ICAI splits into parts (e.g. Income-tax 50 marks + GST 50 marks): percentages are of that part. */
  part: z.string().optional(),
});
export const WeightPaperSchema = z.object({
  level: z.enum(LEVELS),
  paper: z.string().min(1),
  /** Which MarkMate subject this paper is, so the page can link to practice. */
  subjectId: z.string().optional(),
  unit: z.enum(["percent", "marks"]),
  items: z.array(WeightItemSchema).min(1),
  ...Source,
});
export type WeightPaper = z.infer<typeof WeightPaperSchema>;
export type WeightItem = z.infer<typeof WeightItemSchema>;

export const ExamInsightsSchema = z.object({
  asOf: z.string(),
  passRates: z.array(PassRateSchema),
  weightage: z.array(WeightPaperSchema),
});
export type ExamInsights = z.infer<typeof ExamInsightsSchema>;

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

/** "May 2025" → 202505, for ordering attempts. Unknown names sort last. */
export function attemptOrder(attempt: string): number {
  const m = attempt.toLowerCase().match(/([a-z]{3})[a-z]*\.?\s*(\d{4})/);
  return m && MONTHS[m[1]] ? Number(m[2]) * 100 + MONTHS[m[1]] : 0;
}

/** The headline figure per level: Foundation has one; Inter and Final use "both groups", else what exists. */
export function headlineRates(rates: PassRate[], level: ExamLevel): PassRate[] {
  const mine = rates.filter((r) => r.level === level && r.passPercent !== null);
  const prefer = level === "foundation" ? ["overall"] : ["both", "overall"];
  const byAttempt = new Map<string, PassRate>();
  for (const g of [...prefer, "group1", "group2"])
    for (const r of mine) if (r.group === g && !byAttempt.has(r.attempt)) byAttempt.set(r.attempt, r);
  return [...byAttempt.values()].sort((a, b) => attemptOrder(b.attempt) - attemptOrder(a.attempt));
}

export type Difficulty = "lower" | "typical" | "higher";

export type AttemptRow = PassRate & { passPercent: number; vsAverage: number; band: Difficulty };

/** Compares each attempt's pass rate with the average of the attempts shown (±2 points counts as typical). */
export function analyseAttempts(rows: PassRate[]): { rows: AttemptRow[]; average: number | null; hardest: AttemptRow | null; easiest: AttemptRow | null } {
  const withPct = rows.filter((r): r is PassRate & { passPercent: number } => r.passPercent !== null);
  if (!withPct.length) return { rows: [], average: null, hardest: null, easiest: null };
  const average = withPct.reduce((s, r) => s + r.passPercent, 0) / withPct.length;
  const out = withPct.map((r) => {
    const vsAverage = r.passPercent - average;
    return { ...r, vsAverage, band: (vsAverage < -2 ? "lower" : vsAverage > 2 ? "higher" : "typical") as Difficulty };
  });
  const sorted = [...out].sort((a, b) => a.passPercent - b.passPercent);
  return { rows: out, average, hardest: out.length > 1 ? sorted[0] : null, easiest: out.length > 1 ? sorted[sorted.length - 1] : null };
}

export type RankedGroup = { part: string | null; items: (WeightItem & { focus: boolean })[] };

/**
 * Sections by published weightage, heaviest first (top of the range, then the bottom), ranked within each
 * part of the paper, since a part's percentages are of that part only. The heaviest third of each part
 * (ties included) is marked "focus first".
 */
export function rankChapters(paper: WeightPaper): RankedGroup[] {
  const parts: (string | null)[] = [...new Set(paper.items.map((it) => it.part ?? null))];
  return parts.map((part) => {
    const sorted = paper.items.filter((it) => (it.part ?? null) === part).sort((a, b) => b.max - a.max || b.min - a.min);
    const cut = sorted[Math.max(0, Math.ceil(sorted.length / 3) - 1)].max;
    return { part, items: sorted.map((it) => ({ ...it, focus: it.max >= cut && it.max > 0 })) };
  });
}
