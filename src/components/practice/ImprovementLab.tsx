"use client";

/**
 * Improvement Lab: rewrite an answer with Attempt 1's feedback beside it.
 * Attempt 1 is shown read-only and is never changed here. Suggestions guide; they are never inserted into the answer.
 */
import { useState } from "react";
import { countOutcomes, overallAssessment, topPriorities } from "@/lib/insights";
import type { AttemptResult } from "@/lib/schema";
import { cn, fmt, type Tone } from "@/lib/ui";
import { Badge, Button, Card, ErrorMessage, Icon, LoadingState, ScoreRing, type IconName } from "../ui";
import { AnswerWorkspace } from "./AnswerWorkspace";

const OUTCOME_BADGE: Record<string, { label: string; tone: Tone; icon: IconName }> = {
  missed: { label: "Missed", tone: "neutral", icon: "minus" },
  partial: { label: "Partially covered", tone: "attention", icon: "partial" },
  contradicted: { label: "Contradicted", tone: "error", icon: "error" },
};

type Tab = "rewrite" | "focus" | "original";

export function ImprovementLab({
  context,
  maxMarks,
  first,
  firstAnswer,
  attemptNo,
  rewrite,
  onRewrite,
  onSubmit,
  busy,
  problem,
  failure,
  onRetry,
  onBackToMap,
}: {
  context: string[];
  maxMarks?: number;
  first: AttemptResult;
  firstAnswer: string;
  attemptNo: number;
  rewrite: string;
  onRewrite: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
  problem: string | null;
  failure: string | null;
  onRetry: () => void;
  onBackToMap: () => void;
}) {
  const [tab, setTab] = useState<Tab>("rewrite");
  const tabs: { id: Tab; label: string }[] = [
    { id: "rewrite", label: "Your rewrite" },
    { id: "focus", label: "What to focus on" },
    { id: "original", label: "Attempt 1" },
  ];

  return (
    <section aria-labelledby="lab-heading" className="animate-fade-in space-y-5">
      {/* Header and context */}
      <Card className="p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 id="lab-heading" className="text-[1.5rem] font-bold leading-tight">
              Improvement Lab
            </h2>
            <p className="mt-1 text-[16px] text-muted">Turn feedback into a stronger answer.</p>
            <p className="mt-3 text-[13px] text-muted">{context.join(" · ")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="brand">
                <Icon name="edit" className="size-3.5" /> New attempt · Attempt {attemptNo}
              </Badge>
              {maxMarks !== undefined && <Badge tone="neutral">{maxMarks} marks</Badge>}
              <Badge tone="neutral">Same marking scheme as Attempt 1</Badge>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={onBackToMap} className="self-start">
            <Icon name="back" /> Back to Lost Marks Map
          </Button>
        </div>
      </Card>

      {/* Small screens: switch between the three parts instead of stacking them */}
      <div role="tablist" aria-label="Improvement Lab" className="grid grid-cols-3 gap-1 rounded-card bg-subtle p-1 lg:hidden">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`lab-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`lab-panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-control px-2 py-2 text-[13px] font-medium transition-colors",
              tab === t.id ? "bg-surface text-ink shadow-soft" : "text-muted hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Attempt N: the rewrite */}
        <div id="lab-panel-rewrite" role="tabpanel" aria-labelledby="lab-tab-rewrite" className={cn("min-w-0 space-y-4", tab !== "rewrite" && "hidden lg:block")}>
          <AnswerWorkspace
            id="rewrite"
            label={`Attempt ${attemptNo} · your improved answer`}
            help="We started you off with Attempt 1. Edit, remove or add anything. Use the focus points as a guide, in your own words."
            value={rewrite}
            onChange={onRewrite}
            onSubmit={onSubmit}
            maxMarks={maxMarks}
            busy={busy}
            problem={problem}
            submitLabel="Evaluate Improved Answer"
          />
          <div aria-live="polite" className="space-y-3 empty:hidden">
            {busy && <LoadingState message="Evaluating your improved answer…" detail="Using the same marking scheme as Attempt 1." rows={2} />}
            {failure && !busy && (
              <>
                <ErrorMessage title="Your improved answer wasn't evaluated">
                  {failure} Your rewrite is still in the editor, so nothing is lost.
                </ErrorMessage>
                <Button variant="secondary" size="sm" onClick={onRetry}>
                  <Icon name="refresh" /> Try again
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Guidance and the original, secondary to the editor */}
        <aside className="space-y-5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto">
          <div id="lab-panel-focus" role="tabpanel" aria-labelledby="lab-tab-focus" className={cn(tab !== "focus" && "hidden lg:block")}>
            <FocusPanel first={first} />
          </div>
          <div id="lab-panel-original" role="tabpanel" aria-labelledby="lab-tab-original" className={cn(tab !== "original" && "hidden lg:block")}>
            <OriginalPanel first={first} answer={firstAnswer} />
          </div>
        </aside>
      </div>
    </section>
  );
}

function FocusPanel({ first }: { first: AttemptResult }) {
  const items = topPriorities(first.points, 4);
  return (
    <Card className="p-5">
      <h3 className="font-display text-[16px] font-semibold">What to Focus On</h3>
      <p className="mt-0.5 text-[13px] text-muted">From your Attempt 1 feedback, biggest gaps first.</p>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-ink">You covered every marking point in Attempt 1. Use this attempt to tighten wording and presentation.</p>
      ) : (
        <ol className="mt-4 space-y-4">
          {items.map((p, i) => {
            const b = OUTCOME_BADGE[p.outcome];
            const reason = first.points.find((x) => x.pointId === p.pointId)?.reason;
            return (
              <li key={p.pointId} className="border-l-2 border-line pl-3">
                <p className="text-[12px] text-muted">Focus {i + 1}</p>
                <p className="text-[14px] font-medium leading-snug text-ink">{p.label}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge tone={b.tone} className="text-[12px]">
                    <Icon name={b.icon} className="size-3" /> {b.label}
                  </Badge>
                  <span className="text-[12px] tabular-nums text-muted">{fmt(p.marksAtStake)} at stake</span>
                </div>
                {reason && (
                  <p className="mt-2 text-[13px] leading-relaxed text-ink">
                    <span className="font-medium">Why it matters: </span>
                    {reason}
                  </p>
                )}
                <p className="mt-1 text-[13px] leading-relaxed text-brand">
                  <span className="font-medium">Try: </span>
                  {p.action}
                </p>
              </li>
            );
          })}
        </ol>
      )}
      <p className="mt-4 text-[12px] text-muted">Suggestions are guidance only and are never added to your answer for you.</p>
    </Card>
  );
}

function OriginalPanel({ first, answer }: { first: AttemptResult; answer: string }) {
  const c = countOutcomes(first.points);
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-[16px] font-semibold">Attempt 1</h3>
          <p className="text-[13px] text-muted">Submitted answer · read-only</p>
        </div>
        <ScoreRing value={first.estimatedMarks} max={first.maxMarks} size={64} />
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-ink">{overallAssessment(first)}</p>
      <ul className="mt-3 flex flex-wrap gap-1.5 text-[12px]" aria-label="Attempt 1 marking points">
        <li><Badge tone="success" className="text-[12px]">{c.covered} covered</Badge></li>
        <li><Badge tone="attention" className="text-[12px]">{c.partial} partial</Badge></li>
        <li><Badge tone="neutral" className="text-[12px]">{c.missed} missed</Badge></li>
        {c.contradicted > 0 && <li><Badge tone="error" className="text-[12px]">{c.contradicted} contradicted</Badge></li>}
      </ul>
      <p className="mt-3 text-[11px] text-muted">{first.aiUsed ? "AI-generated" : "Rule-based"} practice estimate · not an ICAI mark</p>
      <div className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-control bg-canvas p-3 text-[14px] leading-relaxed text-ink/85 ring-1 ring-inset ring-line">
        {answer}
      </div>
    </Card>
  );
}
