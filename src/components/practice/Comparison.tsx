"use client";

import type { AttemptResult } from "@/lib/schema";
import { cn, fmt } from "@/lib/ui";
import { Card, Icon, Pill } from "../ui";

type Kind = "recovered" | "improved" | "lost" | "missing" | "kept";

const KIND: Record<Kind, { label: string; pill: string; icon: "up" | "down" | "minus" | "check" }> = {
  recovered: { label: "Recovered", pill: "bg-success-soft text-success ring-success/20", icon: "up" },
  improved: { label: "Improved", pill: "bg-mint text-brand ring-brand/15", icon: "up" },
  lost: { label: "Lost", pill: "bg-error-soft text-error ring-error/20", icon: "down" },
  missing: { label: "Still missing", pill: "bg-subtle text-muted ring-line-strong", icon: "minus" },
  kept: { label: "Kept", pill: "bg-canvas text-muted ring-line-strong/20", icon: "check" },
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
    <Card className="animate-fade-in overflow-hidden">
      <div className="relative overflow-hidden bg-brand-dark p-6 text-white sm:p-8">
       <p className="relative font-display text-sm font-semibold text-mint">Attempt 1 vs Attempt 2</p>
        <div className="relative mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <p className="text-sm text-muted">Before</p>
            <p className="text-4xl font-semibold tabular-nums text-white/70">{fmt(c.marksBefore)}</p>
          </div>
          <Icon name="arrow" className="mb-3 size-6 text-muted" />
          <div>
            <p className="text-sm text-muted">After</p>
            <p className="text-5xl font-semibold tabular-nums">
              {fmt(c.marksAfter)}
              <span className="text-2xl font-normal text-muted"> / {second.maxMarks}</span>
            </p>
          </div>
          <span
            className={cn(
              "mb-2 rounded-full px-3 py-1 text-sm font-semibold",
              delta > 0 ? "bg-success/15 text-mint" : delta < 0 ? "bg-error/25 text-error-soft" : "bg-white/10 text-white/70",
            )}
          >
            {delta > 0 ? "+" : ""}
            {fmt(delta)} marks
          </span>
        </div>
        <p className="relative mt-4 max-w-2xl text-sm leading-relaxed text-white/70">{c.summary}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 border-b border-line p-4 sm:grid-cols-4 sm:p-6">
        <Tile n={c.recovered.length} label="Recovered" cls="text-success" />
        <Tile n={c.improved.length} label="Improved" cls="text-brand" />
        <Tile n={c.lost.length} label="Lost" cls="text-error" />
        <Tile n={c.stillMissing.length} label="Still missing" cls="text-muted" />
      </div>

      <ul className="divide-y divide-line">
        {second.points.map((p) => {
          const k = KIND[kindOf(p.pointId)];
          const b = before.get(p.pointId) ?? 0;
          return (
            <li key={p.pointId} className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
              <p className="min-w-0 flex-1 text-sm font-medium">{p.label}</p>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm tabular-nums text-muted">{fmt(b)}</span>
                <Icon name="arrow" className="size-3.5 text-white/70" />
                <span className="font-mono text-sm font-semibold tabular-nums">
                  {fmt(p.aiMarks)}
                  <span className="font-normal text-muted">/{fmt(p.allocated)}</span>
                </span>
                <Pill className={cn("w-28 justify-center", k.pill)}>
                  <Icon name={k.icon} className="size-3" /> {k.label}
                </Pill>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-line px-6 py-3 text-xs text-muted">
        Both attempts were marked with the same scheme ({second.rubricId}, version {second.rubricVersion}). Extra length alone earns nothing.
      </p>
    </Card>
  );
}

function Tile({ n, label, cls }: { n: number; label: string; cls: string }) {
  return (
    <div className="rounded-xl bg-canvas p-3 text-center ring-1 ring-line">
      <p className={cn("text-2xl font-semibold tabular-nums", cls)}>{n}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
