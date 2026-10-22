"use client";

import type { AttemptResult } from "@/lib/schema";
import { cn, fmt } from "@/lib/ui";
import { Card, Icon, Pill } from "../ui";

type Kind = "recovered" | "improved" | "lost" | "missing" | "kept";

const KIND: Record<Kind, { label: string; pill: string; icon: "up" | "down" | "minus" | "check" }> = {
  recovered: { label: "Recovered", pill: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", icon: "up" },
  improved: { label: "Improved", pill: "bg-sky-50 text-sky-700 ring-sky-600/20", icon: "up" },
  lost: { label: "Lost", pill: "bg-rose-50 text-rose-700 ring-rose-600/20", icon: "down" },
  missing: { label: "Still missing", pill: "bg-slate-100 text-slate-600 ring-slate-500/20", icon: "minus" },
  kept: { label: "Kept", pill: "bg-slate-50 text-slate-500 ring-slate-400/20", icon: "check" },
};

/** Attempt 1 vs Attempt 2. All numbers and groups come from the code-computed comparison. */
export default function Comparison({ first, second }: { first: AttemptResult; second: AttemptResult }) {
  const c = second.comparison;
  if (!c) return null;
  const kindOf = (id: string): Kind =>
    c.recovered.some((x) => x.pointId === id)
      ? "recovered"
      : c.improved.some((x) => x.pointId === id)
        ? "improved"
        : c.lost.some((x) => x.pointId === id)
          ? "lost"
          : c.stillMissing.some((x) => x.pointId === id)
            ? "missing"
            : "kept";
  const delta = c.marksAfter - c.marksBefore;
  const before = new Map(first.points.map((p) => [p.pointId, p.aiMarks]));

  return (
    <Card className="animate-fade-up overflow-hidden">
      <div className="relative overflow-hidden bg-ink p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-brand-500/30 blur-3xl" />
        <p className="relative text-xs font-semibold uppercase tracking-[0.14em] text-brand-300">Attempt 1 vs Attempt 2</p>
        <div className="relative mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <p className="text-sm text-slate-400">Before</p>
            <p className="text-4xl font-semibold tabular-nums text-slate-300">{fmt(c.marksBefore)}</p>
          </div>
          <Icon name="arrow" className="mb-3 size-6 text-slate-500" />
          <div>
            <p className="text-sm text-slate-400">After</p>
            <p className="text-5xl font-semibold tabular-nums">
              {fmt(c.marksAfter)}
              <span className="text-2xl font-normal text-slate-500"> / {second.maxMarks}</span>
            </p>
          </div>
          <span
            className={cn(
              "mb-2 rounded-full px-3 py-1 text-sm font-semibold",
              delta > 0 ? "bg-emerald-400/15 text-emerald-300" : delta < 0 ? "bg-rose-400/15 text-rose-300" : "bg-white/10 text-slate-300",
            )}
          >
            {delta > 0 ? "+" : ""}
            {fmt(delta)} marks
          </span>
        </div>
        <p className="relative mt-4 max-w-2xl text-sm leading-relaxed text-slate-300">{c.summary}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 border-b border-slate-100 p-4 sm:grid-cols-4 sm:p-6">
        <Tile n={c.recovered.length} label="Recovered" cls="text-emerald-600" />
        <Tile n={c.improved.length} label="Improved" cls="text-sky-600" />
        <Tile n={c.lost.length} label="Lost" cls="text-rose-600" />
        <Tile n={c.stillMissing.length} label="Still missing" cls="text-slate-500" />
      </div>

      <ul className="divide-y divide-slate-100">
        {second.points.map((p) => {
          const k = KIND[kindOf(p.pointId)];
          const b = before.get(p.pointId) ?? 0;
          return (
            <li key={p.pointId} className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
              <p className="min-w-0 flex-1 text-sm font-medium">{p.label}</p>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm tabular-nums text-slate-400">{fmt(b)}</span>
                <Icon name="arrow" className="size-3.5 text-slate-300" />
                <span className="font-mono text-sm font-semibold tabular-nums">
                  {fmt(p.aiMarks)}
                  <span className="font-normal text-slate-400">/{fmt(p.allocated)}</span>
                </span>
                <Pill className={cn("w-28 justify-center", k.pill)}>
                  <Icon name={k.icon} className="size-3" /> {k.label}
                </Pill>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-slate-100 px-6 py-3 text-xs text-slate-500">
        Both attempts were marked with the same scheme ({second.rubricId}, version {second.rubricVersion}). Extra length alone earns nothing.
      </p>
    </Card>
  );
}

function Tile({ n, label, cls }: { n: number; label: string; cls: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center ring-1 ring-slate-200/70">
      <p className={cn("text-2xl font-semibold tabular-nums", cls)}>{n}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
