"use client";

/**
 * The Lost Marks Map: renders one validated evaluation result. Subject-agnostic: it only reads the
 * result's marking points (labels, marks, statuses, verified quotes, feedback and rubric requirement).
 * It never computes marks; summaries come from src/lib/insights.ts.
 */
import { useId, useMemo, useState } from "react";
import { countOutcomes, OUTCOME_OF, overallAssessment, topPriorities, type Outcome, type Priority } from "@/lib/insights";
import type { AttemptResult, PointResult } from "@/lib/schema";
import { cn, fmt, highlightSegments, STATUS_META, TONE, type Tone } from "@/lib/ui";
import { Badge, Button, Card, Icon, ScoreRing, type IconName } from "../ui";

const OUTCOME: Record<Outcome, { label: string; tone: Tone; icon: IconName }> = {
  covered: { label: "Covered", tone: "success", icon: "success" },
  partial: { label: "Partially covered", tone: "attention", icon: "partial" },
  missed: { label: "Missed", tone: "neutral", icon: "minus" },
  contradicted: { label: "Contradicted", tone: "error", icon: "error" },
  review: { label: "Needs review", tone: "attention", icon: "alert" },
};

type Filter = "all" | "missed" | "partial" | "covered";

const marks = (n: number) => `${fmt(n)} mark${n === 1 ? "" : "s"}`;

export default function LostMarksMap({
  result,
  answer,
  title,
  onImprove,
  onBackToAnswer,
}: {
  result: AttemptResult;
  answer: string;
  title: string;
  onImprove?: () => void;
  onBackToAnswer?: () => void;
}) {
  const counts = useMemo(() => countOutcomes(result.points), [result]);
  const priorities = useMemo(() => topPriorities(result.points), [result]);
  const assessment = useMemo(() => overallAssessment(result), [result]);
  const lost = result.maxMarks - result.estimatedMarks;
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="animate-fade-in space-y-5">
      {/* A. Performance summary */}
      <Card className="overflow-hidden">
        <div className="p-5 sm:p-7">
          <p className="font-display text-sm font-semibold text-brand-600">{title}</p>
          <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex shrink-0 flex-col items-center gap-2">
              <ScoreRing value={result.estimatedMarks} max={result.maxMarks} size={132} />
              <p className="text-[13px] text-muted">marks</p>
            </div>
            <div className="min-w-0 flex-1">
              <h2 id={headingId} className="text-[1.5rem] font-bold leading-tight">
                {lost > 0 ? (
                  <>
                    You lost {marks(lost)} of {result.maxMarks}
                  </>
                ) : (
                  "Full marks on every point"
                )}
              </h2>
              <p className="mt-2 text-[16px] leading-relaxed text-ink">{assessment}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="neutral">
                  <Icon name="info" className="size-3.5" />
                  {result.aiUsed ? "AI-generated practice estimate" : "Rule-based practice estimate"} · not an ICAI mark
                </Badge>
                <Badge tone={result.verified ? "success" : "neutral"}>{result.verified ? "Verified marking scheme" : "Unverified marking scheme"}</Badge>
              </div>
            </div>
          </div>

          <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Marking points by outcome">
            {(Object.keys(OUTCOME) as Outcome[]).map((o) => (
              <li key={o} className="rounded-control bg-canvas px-3 py-2.5 ring-1 ring-inset ring-line">
                <p className="text-xl font-bold tabular-nums">{counts[o]}</p>
                <p className="flex items-center gap-1.5 text-[13px] text-muted">
                  <Icon name={OUTCOME[o].icon} className={cn("size-3.5", TONE[OUTCOME[o].tone].badge.split(" ").find((c) => c.startsWith("text-")))} />
                  {OUTCOME[o].label}
                </p>
              </li>
            ))}
          </ul>

          {/* One segment per marking point; width follows its marks. Decorative: the counts above say the same. */}
          <div className="mt-4 flex h-2 gap-1" aria-hidden>
            {result.points.map((p) => (
              <div key={p.pointId} className="relative h-full overflow-hidden rounded-full bg-subtle" style={{ flex: p.allocated }}>
                <div className={cn("h-full rounded-full", STATUS_META[p.aiStatus].bar)} style={{ width: `${(p.aiMarks / p.allocated) * 100}%` }} />
              </div>
            ))}
          </div>

          {result.aiError && (
            <p className="mt-4 flex gap-2 rounded-control bg-subtle p-3 text-sm text-ink">
              <Icon name="info" className="mt-0.5" />
              The AI was not available ({result.aiError.replace(/\.$/, "")}), so the local rule-based marker checked this answer. Its judgements are less nuanced.
            </p>
          )}
          {result.needsReview && (
            <p className="mt-4 flex gap-2 rounded-control bg-warning-soft p-3 text-sm text-ink">
              <Icon name="alert" className="mt-0.5 text-warning" />
              {marks(result.pendingReviewMarks)} {result.pendingReviewMarks === 1 ? "is" : "are"} held for review: the marker couldn&apos;t back
              {result.pendingReviewMarks === 1 ? " it" : " them"} with wording from your answer, so no marks were given there.
            </p>
          )}
        </div>

        {(onImprove || onBackToAnswer) && (
          <div className="flex flex-col-reverse gap-2 border-t border-line bg-canvas px-5 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-7">
            {onBackToAnswer && (
              <Button variant="ghost" size="sm" onClick={onBackToAnswer}>
                <Icon name="back" /> Back to my answer
              </Button>
            )}
            {onImprove && (
              <Button onClick={onImprove}>
                Improve My Answer <Icon name="arrow" />
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* D + E. Priorities with suggested improvements */}
      {priorities.length > 0 && <Priorities items={priorities} />}

      {/* B. The map */}
      <MarkingPoints result={result} answer={answer} counts={counts} />

      {/* Supporting information */}
      {(result.missingReferences.length > 0 || result.missingKeywords.length > 0 || result.presentationTips.length > 0) && (
        <div className="grid gap-3 md:grid-cols-3">
          <Extra title="References not mentioned" icon="book" empty="None. Good.">
            {result.missingReferences.map((r) => (
              <span key={r} className="rounded-md bg-surface px-2 py-1 text-[13px] font-medium text-ink ring-1 ring-line">
                {r}
              </span>
            ))}
          </Extra>
          <Extra title="Key terms not used" icon="spark" empty="None. Good.">
            {result.missingKeywords.map((k) => (
              <span key={k} className="rounded-md bg-surface px-2 py-1 text-[13px] text-ink ring-1 ring-line">
                {k}
              </span>
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
    </section>
  );
}

/* ------------------------------ Priorities ------------------------------ */

function Priorities({ items }: { items: Priority[] }) {
  return (
    <Card className="p-5 sm:p-7">
      <h3 className="text-card font-semibold">Your Top Improvement Priorities</h3>
      <p className="mt-1 text-sm text-muted">The changes that would recover the most marks, starting with the biggest.</p>
      <ol className="mt-5 space-y-4">
        {items.map((p, i) => {
          const o = OUTCOME[p.outcome];
          return (
            <li key={p.pointId} className="flex gap-4">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand font-display text-sm font-bold text-white">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-ink">{p.label}</p>
                  <Badge tone={o.tone}>
                    <Icon name={o.icon} className="size-3.5" /> {o.label}
                  </Badge>
                  <span className="text-[13px] tabular-nums text-muted">{marks(p.marksAtStake)} at stake</span>
                </div>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink">
                  {p.outcome === "contradicted" ? "Correct this: " : p.outcome === "partial" ? "Make it complete: " : "Add this: "}
                  {p.action}
                </p>
                <SuggestedImprovement text={p.requirement} className="mt-2.5" />
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

/** Reference text from the marking scheme, never presented as the student's words or an official answer. */
function SuggestedImprovement({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("rounded-control border-l-[3px] border-brand-300 bg-brand-50 px-3.5 py-2.5", className)}>
      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-brand">
        <Icon name="idea" className="size-3.5" /> Suggested improvement
      </p>
      <p className="mt-1 text-[14px] leading-relaxed text-ink">A complete answer to this point covers: {text}</p>
      <p className="mt-1 text-[12px] text-muted">From the question&apos;s marking scheme. Not your wording, and not an official model answer.</p>
    </div>
  );
}

/* ---------------------------- Marking points ---------------------------- */

function MarkingPoints({ result, answer, counts }: { result: AttemptResult; answer: string; counts: ReturnType<typeof countOutcomes> }) {
  const [view, setView] = useState<"points" | "answer">("points");
  const [filter, setFilter] = useState<Filter>("all");
  // Points that lost marks start open; covered ones start closed.
  const [open, setOpen] = useState<Set<string>>(() => new Set(result.points.filter((p) => p.aiMarks < p.allocated).map((p) => p.pointId)));

  const matches = (p: PointResult) => {
    const o = OUTCOME_OF[p.aiStatus];
    if (filter === "missed") return o === "missed" || o === "contradicted";
    if (filter === "partial") return o === "partial";
    if (filter === "covered") return o === "covered";
    return true;
  };
  const shown = result.points.filter(matches);
  const filters: { id: Filter; label: string; n: number }[] = [
    { id: "all", label: "All", n: result.points.length },
    { id: "missed", label: "Missed or contradicted", n: counts.missed + counts.contradicted },
    { id: "partial", label: "Partially covered", n: counts.partial },
    { id: "covered", label: "Covered", n: counts.covered },
  ];
  const allOpen = shown.every((p) => open.has(p.pointId));
  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line p-5 sm:p-7">
        <h3 className="text-[1.375rem] font-bold">Lost Marks Map</h3>
        <p className="mt-1 text-[15px] text-muted">Every marking point in the scheme, and where your answer stands on it.</p>
        <div className="mt-4 inline-flex rounded-control bg-subtle p-1 text-sm" role="tablist" aria-label="View">
          {(["points", "answer"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cn("rounded-[8px] px-3 py-1.5 font-medium transition-colors", view === v ? "bg-surface text-ink shadow-soft" : "text-muted hover:text-ink")}
            >
              {v === "points" ? "Marking points" : "Your answer, annotated"}
            </button>
          ))}
        </div>
      </div>

      {view === "points" ? (
        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter marking points">
              {filters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium ring-1 ring-inset transition-colors",
                    filter === f.id ? "bg-brand text-white ring-brand" : "bg-surface text-ink ring-line-strong hover:bg-canvas",
                  )}
                >
                  {f.label} <span className={cn("tabular-nums", filter === f.id ? "text-white/75" : "text-muted")}>{f.n}</span>
                </button>
              ))}
            </div>
            {shown.length > 0 && (
              <button
                type="button"
                onClick={() => setOpen((s) => (allOpen ? new Set([...s].filter((id) => !shown.some((p) => p.pointId === id))) : new Set([...s, ...shown.map((p) => p.pointId)])))}
                className="rounded text-[13px] font-medium text-brand hover:underline"
              >
                {allOpen ? "Collapse all" : "Expand all"}
              </button>
            )}
          </div>

          <ul className="mt-4 space-y-3">
            {shown.map((p) => (
              <li key={p.pointId}>
                <PointItem p={p} index={result.points.indexOf(p) + 1} open={open.has(p.pointId)} onToggle={() => toggle(p.pointId)} />
              </li>
            ))}
          </ul>
          {!shown.length && <p className="py-8 text-center text-sm text-muted">No marking points in this view.</p>}
        </div>
      ) : (
        <div className="p-5 sm:p-7">
          <AnnotatedAnswer result={result} answer={answer} />
        </div>
      )}
    </Card>
  );
}

function PointItem({ p, index, open, onToggle }: { p: PointResult; index: number; open: boolean; onToggle: () => void }) {
  const outcome = OUTCOME_OF[p.aiStatus];
  const o = OUTCOME[outcome];
  const full = p.aiMarks >= p.allocated;
  const panelId = useId();
  const hasEvidence = p.evidenceVerified && p.evidenceQuote.trim() !== "";
  const preview = full ? "Full marks for this point." : p.reason || p.reviewReason || "No supporting evidence found in your answer.";

  return (
    <div className="relative overflow-hidden rounded-card bg-surface ring-1 ring-line">
      <span className={cn("absolute inset-y-0 left-0 w-1", STATUS_META[p.aiStatus].bar)} aria-hidden />
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-start gap-3 py-4 pl-5 pr-4 text-left transition-colors hover:bg-canvas/60 focus-visible:-outline-offset-2"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[12px] text-muted">Marking point {index}</p>
          <p className="mt-0.5 font-medium leading-snug text-ink">{p.label}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={o.tone}>
              <Icon name={o.icon} className="size-3.5" /> {o.label}
            </Badge>
            {!open && <span className="line-clamp-1 text-[13px] text-muted">{preview}</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <p className="text-right font-display text-lg font-bold tabular-nums">
            {fmt(p.aiMarks)}
            <span className="text-sm font-medium text-muted"> / {fmt(p.allocated)}</span>
          </p>
          <Icon name="chevron" className={cn("text-muted transition-transform", open && "rotate-90")} />
        </div>
      </button>

      {open && (
        <div id={panelId} className="space-y-4 border-t border-line py-4 pl-5 pr-4 text-[14px]">
          <Detail label="What this point needs">
            <p className="leading-relaxed text-ink">{p.requirement}</p>
          </Detail>

          <Detail label="Evidence from your answer">
            {hasEvidence ? (
              <blockquote className="rounded-control bg-canvas px-3.5 py-2.5 leading-relaxed">
                <mark className={STATUS_META[p.aiStatus].mark}>“{p.evidenceQuote}”</mark>
                <p className="mt-1.5 flex items-center gap-1 text-[12px] text-muted">
                  <Icon name="check" className="size-3.5" /> Your exact words, checked against your answer
                </p>
              </blockquote>
            ) : outcome === "review" && p.evidenceQuote ? (
              <p className="rounded-control border border-dashed border-accent/60 px-3.5 py-2.5 text-ink">
                The marker pointed to wording that isn&apos;t in your answer, so it isn&apos;t shown here and this point is held for review.
              </p>
            ) : (
              <p className="rounded-control border border-dashed border-line-strong px-3.5 py-2.5 text-muted">No supporting evidence found in your answer.</p>
            )}
          </Detail>

          {!full && p.reason && (
            <Detail label="Why marks may have been lost">
              <p className="leading-relaxed text-ink">{p.reason}</p>
            </Detail>
          )}
          {p.reviewReason && (
            <Detail label="Why this is held for review">
              <p className="leading-relaxed text-ink">{p.reviewReason}</p>
            </Detail>
          )}
          {!full && p.toRecover && (
            <Detail label="How to improve">
              <p className="flex gap-2 leading-relaxed text-brand">
                <Icon name="arrow" className="mt-1" /> {p.toRecover}
              </p>
            </Detail>
          )}
        </div>
      )}
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[12px] font-semibold text-muted">{label}</p>
      {children}
    </div>
  );
}

function AnnotatedAnswer({ result, answer }: { result: AttemptResult; answer: string }) {
  const segs = highlightSegments(
    answer,
    result.points
      .filter((p) => p.evidenceVerified && p.evidenceQuote)
      .map((p) => ({ text: p.evidenceQuote, cls: STATUS_META[p.aiStatus].mark, id: `${p.label}: ${STATUS_META[p.aiStatus].label}` })),
  );
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-muted">
        <span className="flex items-center gap-1.5">
          <mark className="evidence">text</mark> covered a point
        </span>
        <span className="flex items-center gap-1.5">
          <mark className="evidence evidence-partial">text</mark> partly covered
        </span>
        <span className="flex items-center gap-1.5">
          <mark className="evidence evidence-wrong">text</mark> contradicted
        </span>
        <span>Unmarked text earned nothing.</span>
      </div>
      <div className="whitespace-pre-wrap rounded-control bg-canvas p-4 text-[15px] leading-7 text-ink ring-1 ring-inset ring-line">
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

function Extra({ title, icon, empty, children }: { title: string; icon: IconName; empty: string; children: React.ReactNode }) {
  const has = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="rounded-card bg-surface p-4 ring-1 ring-line">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <Icon name={icon} className="text-muted" /> {title}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">{has ? children : <span className="text-[13px] text-muted">{empty}</span>}</div>
    </div>
  );
}
