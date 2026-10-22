import type { Status } from "./schema";

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export const STATUS_META: Record<Status, { label: string; pill: string; bar: string; dot: string; mark: string }> = {
  correct_complete: {
    label: "Secured",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    bar: "bg-emerald-500",
    dot: "bg-emerald-500",
    mark: "evidence",
  },
  correct_incomplete: {
    label: "Partly covered",
    pill: "bg-amber-50 text-amber-700 ring-amber-600/20",
    bar: "bg-amber-400",
    dot: "bg-amber-400",
    mark: "evidence evidence-partial",
  },
  incorrect: {
    label: "Incorrect",
    pill: "bg-rose-50 text-rose-700 ring-rose-600/20",
    bar: "bg-rose-500",
    dot: "bg-rose-500",
    mark: "evidence evidence-wrong",
  },
  not_addressed: {
    label: "Missed",
    pill: "bg-slate-100 text-slate-600 ring-slate-500/20",
    bar: "bg-slate-300",
    dot: "bg-slate-400",
    mark: "evidence",
  },
  uncertain: {
    label: "Needs review",
    pill: "bg-violet-50 text-violet-700 ring-violet-600/20",
    bar: "bg-violet-400",
    dot: "bg-violet-500",
    mark: "evidence",
  },
};

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
