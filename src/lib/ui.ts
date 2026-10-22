import type { Status } from "./schema";

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** Visual tones shared by badges, alerts and status bars. */
export type Tone = "brand" | "success" | "attention" | "error" | "neutral";

export const TONE: Record<Tone, { badge: string; bar: string; dot: string; alert: string }> = {
  brand: { badge: "bg-mint text-brand ring-brand/15", bar: "bg-brand", dot: "bg-brand", alert: "bg-brand-50 text-brand ring-brand/15" },
  success: { badge: "bg-success-soft text-success ring-success/20", bar: "bg-success", dot: "bg-success", alert: "bg-success-soft text-success ring-success/20" },
  attention: { badge: "bg-warning-soft text-warning ring-accent/30", bar: "bg-accent", dot: "bg-accent", alert: "bg-warning-soft text-warning ring-accent/30" },
  error: { badge: "bg-error-soft text-error ring-error/20", bar: "bg-error", dot: "bg-error", alert: "bg-error-soft text-error ring-error/20" },
  neutral: { badge: "bg-subtle text-muted ring-line-strong/60", bar: "bg-line-strong", dot: "bg-muted", alert: "bg-subtle text-ink ring-line" },
};

/**
 * How each marking status looks. Amber = needs attention (partial or held for review);
 * red is reserved for incorrect or contradictory answers.
 */
export const STATUS_META: Record<Status, { label: string; tone: Tone; pill: string; bar: string; dot: string; mark: string }> = {
  correct_complete: { label: "Covered", tone: "success", ...pick("success"), mark: "evidence" },
  correct_incomplete: { label: "Partially covered", tone: "attention", ...pick("attention"), mark: "evidence evidence-partial" },
  incorrect: { label: "Contradicted", tone: "error", ...pick("error"), mark: "evidence evidence-wrong" },
  not_addressed: { label: "Missed", tone: "neutral", ...pick("neutral"), mark: "evidence" },
  uncertain: { label: "Needs review", tone: "attention", ...pick("attention"), mark: "evidence evidence-partial" },
};

function pick(t: Tone) {
  return { pill: TONE[t].badge, bar: TONE[t].bar, dot: TONE[t].dot };
}

/** Splits an answer into plain and highlighted segments for each verified quote (whitespace/case-insensitive). */
export function highlightSegments(
  answer: string,
  quotes: { text: string; cls: string; id: string }[],
): { text: string; cls?: string; id?: string }[] {
  const ranges: { start: number; end: number; cls: string; id: string }[] = [];
  for (const q of quotes) {
    const words = q.text.trim().split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    const re = new RegExp(words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+"), "i");
    const m = re.exec(answer);
    if (!m) continue;
    const start = m.index;
    const end = start + m[0].length;
    if (ranges.some((r) => start < r.end && end > r.start)) continue;
    ranges.push({ start, end, cls: q.cls, id: q.id });
  }
  ranges.sort((a, b) => a.start - b.start);
  const out: { text: string; cls?: string; id?: string }[] = [];
  let pos = 0;
  for (const r of ranges) {
    if (r.start > pos) out.push({ text: answer.slice(pos, r.start) });
    out.push({ text: answer.slice(r.start, r.end), cls: r.cls, id: r.id });
    pos = r.end;
  }
  if (pos < answer.length) out.push({ text: answer.slice(pos) });
  return out;
}
