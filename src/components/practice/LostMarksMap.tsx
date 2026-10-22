"use client";

import { useMemo, useState } from "react";
import type { AttemptResult, PointResult } from "@/lib/schema";
import { cn, fmt, highlightSegments, STATUS_META } from "@/lib/ui";
import { Card, Icon, Pill, ScoreRing } from "../ui";

type Filter = "all" | "lost" | "secured";

export default function LostMarksMap({ result, answer, title }: { result: AttemptResult; answer: string; title: string }) {
  const [view, setView] = useState<"points" | "answer">("points");
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const c = { secured: 0, partial: 0, missed: 0, review: 0 };
    for (const p of result.points) {
      if (p.needsReview) c.review++;
      else if (p.aiMarks >= p.allocated) c.secured++;
      else if (p.aiMarks > 0) c.partial++;
      else c.missed++;
    }
    return c;
  }, [result]);

  const lost = result.maxMarks - result.estimatedMarks;
  const shown = result.points.filter((p) =>
    filter === "all" ? true : filter === "lost" ? p.aiMarks < p.allocated : p.aiMarks >= p.allocated,
  );

  return (
    <Card className="animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="border-b border-line bg-surface p-5 sm:p-7">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <ScoreRing value={result.estimatedMarks} max={result.maxMarks} size={128} />
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-semibold text-brand-600">{title}</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              {lost > 0 ? (
                <>
                  You lost <span className="text-error">{fmt(lost)}</span> of {result.maxMarks} marks
                </>
              ) : (
                "Full marks on every point"
              )}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Pill className={result.aiUsed ? "bg-brand-50 text-brand-700 ring-brand-600/20" : "bg-subtle text-ink ring-line-strong"}>
                <Icon name="spark" className="size-3" />
                {result.aiUsed ? "AI-estimated" : "Rule-based"} practice marks, not ICAI marks
              </Pill>
              <Pill className={result.verified ? "bg-success-soft text-success ring-success/20" : "bg-warning-soft text-warning ring-accent/30"}>
                {result.verified ? "Verified scheme" : "Unverified scheme"}
              </Pill>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2 text-center sm:max-w-md">
              <Count n={counts.secured} label="Secured" dot="bg-success" />
              <Count n={counts.partial} label="Partial" dot="bg-accent" />
              <Count n={counts.missed} label="Missed" dot="bg-muted" />
              <Count n={counts.review} label="Review" dot="bg-accent" />
            </div>
          </div>
        </div>

        {/* Segmented bar: one segment per marking point, width = allocation. */}
        <div className="mt-6 flex h-2.5 gap-1 overflow-hidden rounded-full">
          {result.points.map((p) => (
            <div key={p.pointId} className="relative h-full overflow-hidden rounded-full bg-subtle" style={{ flex: p.allocated }} title={`${p.label}: ${fmt(p.aiMarks)}/${fmt(p.allocated)}`}>
              <div className={cn("h-full rounded-full", STATUS_META[p.aiStatus].bar)} style={{ width: `${(p.aiMarks / p.allocated) * 100}%` }} />
            </div>
          ))}
        </div>

        {result.aiError && (
          <p className="mt-4 flex gap-2 rounded-xl bg-subtle p-3 text-sm text-ink">
            <Icon name="alert" className="mt-0.5" />
            The AI was not available ({result.aiError.replace(/\.$/, "")}), so the local rule-based marker checked this answer.
          </p>
        )}
        {result.needsReview && (
          <p className="mt-4 flex gap-2 rounded-xl bg-warning-soft p-3 text-sm text-warning">
            <Icon name="alert" className="mt-0.5" />
            {fmt(result.pendingReviewMarks)} marks are held for review because they could not be backed by a quote from your answer.
          </p>
        )}
      </div>

      {/* View switch */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 sm:px-7">
        <div className="inline-flex rounded-xl bg-subtle p-1 text-sm">
          {(["points", "answer"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn("rounded-lg px-3 py-1.5 font-medium transition", view === v ? "bg-surface text-ink shadow-soft" : "text-muted hover:text-ink")}
            >
              {v === "points" ? (
                <>
                  <span className="sm:hidden">Points</span>
                  <span className="hidden sm:inline">Marking points</span>
                </>
              ) : (
                <>
                  <span className="sm:hidden">Annotated</span>
                  <span className="hidden sm:inline">Your answer, annotated</span>
                </>
              )}
            </button>
          ))}
        </div>
        {view === "points" && (
          <div className="flex gap-1 text-[13px]">
            {(["all", "lost", "secured"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn("rounded-lg px-2.5 py-1 transition", filter === f ? "bg-brand-dark text-white" : "text-muted hover:bg-subtle")}
              >
                {f === "all" ? "All" : f === "lost" ? "Lost marks" : "Secured"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-5 sm:p-7">
        {view === "points" ? (
          <div className="space-y-3">
            {shown.map((p, i) => (
              <PointCard key={p.pointId} p={p} index={result.points.indexOf(p) + 1} delay={i * 50} />
            ))}
            {!shown.length && <p className="py-6 text-center text-sm text-muted">Nothing in this view.</p>}
          </div>
        ) : (
          <AnnotatedAnswer result={result} answer={answer} />
        )}

        {(result.missingReferences.length > 0 || result.missingKeywords.length > 0 || result.presentationTips.length > 0) && (
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <Extra title="Missing SA references" icon="book" empty="None. Good.">
              {result.missingReferences.map((r) => (
                <span key={r} className="rounded-md bg-error-soft px-2 py-1 text-[13px] font-medium text-error ring-1 ring-error/20">{r}</span>
              ))}
            </Extra>
            <Extra title="Missing keywords" icon="spark" empty="None. Good.">
              {result.missingKeywords.map((k) => (
                <span key={k} className="rounded-md bg-canvas px-2 py-1 text-[13px] text-ink ring-1 ring-line">{k}</span>
              ))}
            </Extra>
            <Extra title="Presentation tips" icon="edit" empty="No tips.">
              {result.presentationTips.length > 0 && (
                <ul className="space-y-1.5 text-[13px] text-ink">
                  {result.presentationTips.map((t) => (
                    <li key={t} className="flex gap-1.5">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted" /> {t}
                    </li>
                  ))}
                </ul>
              )}
            </Extra>
          </div>
        )}
      </div>
    </Card>
  );
}

function Count({ n, label, dot }: { n: number; label: string; dot: string }) {
  return (
    <div className="rounded-xl bg-surface px-2 py-2 ring-1 ring-line">
      <p className="text-lg font-semibold tabular-nums">{n}</p>
      <p className="flex items-center justify-center gap-1 text-[11px] text-muted">
        <span className={cn("size-1.5 rounded-full", dot)} /> {label}
      </p>
    </div>
  );
}

function PointCard({ p, index, delay }: { p: PointResult; index: number; delay: number }) {
  const m = STATUS_META[p.aiStatus];
  const full = p.aiMarks >= p.allocated;
  return (
    <div className="animate-fade-in relative overflow-hidden rounded-xl bg-surface ring-1 ring-line" style={{ animationDelay: `${delay}ms` }}>
      <span className={cn("absolute inset-y-0 left-0 w-1", m.bar)} />
      <div className="p-4 pl-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] text-muted">Point {index}</p>
            <h3 className="font-medium leading-snug">{p.label}</h3>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-lg font-semibold tabular-nums">
              {fmt(p.aiMarks)}
              <span className="text-sm font-normal text-muted"> / {fmt(p.allocated)}</span>
            </p>
          </div>
        </div>
        <Pill className={cn("mt-2", m.pill)}>
          <span className={cn("size-1.5 rounded-full", m.dot)} /> {m.label}
        </Pill>

        {p.evidenceQuote && p.evidenceVerified ? (
          <blockquote className="mt-3 rounded-lg bg-canvas p-3 text-sm text-ink">
            <span className="mb-1 flex items-center gap-1 text-[11px] font-medium text-muted">
              <Icon name="quote" className="size-3" /> From your answer · quote verified
            </span>
            <mark className={m.mark}>{p.evidenceQuote}</mark>
          </blockquote>
        ) : (
          !full && (
            <p className="mt-3 rounded-lg border border-dashed border-line p-3 text-sm text-muted">
              No evidence for this point was found in your answer.
            </p>
          )
        )}

        {p.reason && !full && (
          <p className="mt-3 text-sm text-ink">
            <span className="font-medium text-ink">Why marks were lost: </span>
            {p.reason}
          </p>
        )}
        {p.reviewReason && <p className="mt-2 text-sm text-warning">{p.reviewReason}</p>}
        {p.toRecover && !full && (
          <div className="mt-3 flex gap-2 rounded-lg bg-brand-50/70 p-3 text-sm text-brand-900 ring-1 ring-brand-100">
            <Icon name="arrow" className="mt-0.5 text-brand-600" />
            <p>
              <span className="font-medium">To recover: </span>
              {p.toRecover}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function AnnotatedAnswer({ result, answer }: { result: AttemptResult; answer: string }) {
  const segs = highlightSegments(
    answer,
    result.points
      .filter((p) => p.evidenceVerified && p.evidenceQuote)
      .map((p) => ({ text: p.evidenceQuote, cls: STATUS_META[p.aiStatus].mark, id: p.label })),
  );
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-3 text-xs text-muted">
        <span className="flex items-center gap-1.5"><mark className="evidence">text</mark> earned full marks</span>
        <span className="flex items-center gap-1.5"><mark className="evidence evidence-partial">text</mark> partly earned</span>
        <span className="flex items-center gap-1.5"><mark className="evidence evidence-wrong">text</mark> incorrect</span>
        <span>Plain text earned nothing.</span>
      </div>
      <div className="whitespace-pre-wrap rounded-xl bg-canvas p-4 text-[15px] leading-7 text-ink ring-1 ring-line">
        {segs.map((s, i) =>
          s.cls ? (
            <mark key={i} className={s.cls} title={s.id}>
              {s.text}
            </mark>
          ) : (
            <span key={i}>{s.text}</span>
          ),
        )}
      </div>
    </div>
  );
}

function Extra({ title, icon, empty, children }: { title: string; icon: "book" | "spark" | "edit"; empty: string; children: React.ReactNode }) {
  const has = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="rounded-xl bg-canvas p-4 ring-1 ring-line">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <Icon name={icon} className="text-muted" /> {title}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">{has ? children : <span className="text-[13px] text-muted">{empty}</span>}</div>
    </div>
  );
}
