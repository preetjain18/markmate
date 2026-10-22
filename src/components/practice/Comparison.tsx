"use client";

/**
 * Attempt 1 vs the latest attempt. Every number and transition comes from compareResults()
 * over the two validated results; nothing here estimates or invents marks.
 */
import { useMemo, useState } from "react";
import { compareResults, type Change, type TransitionRow } from "@/lib/compare";
import type { Outcome } from "@/lib/insights";
import type { AttemptResult } from "@/lib/schema";
import { cn, fmt, type Tone } from "@/lib/ui";
import { Alert, Badge, Button, ButtonLink, Card, Icon, type IconName } from "../ui";

const OUTCOME: Record<Outcome, { label: string; tone: Tone }> = {
  covered: { label: "Covered", tone: "success" },
  partial: { label: "Partially covered", tone: "attention" },
  missed: { label: "Missed", tone: "neutral" },
  contradicted: { label: "Contradicted", tone: "error" },
  review: { label: "Needs review", tone: "attention" },
};

const CHANGE: Record<Change, { label: string; tone: Tone; icon: IconName }> = {
  "newly-covered": { label: "Now covered", tone: "success", icon: "up" },
  improved: { label: "Improved", tone: "brand", icon: "up" },
  kept: { label: "Still covered", tone: "neutral", icon: "check" },
  "still-missing": { label: "Still missing", tone: "neutral", icon: "minus" },
  worse: { label: "Got worse", tone: "error", icon: "down" },
  unclear: { label: "Held for review", tone: "attention", icon: "alert" },
};

const marks = (n: number) => `${fmt(Math.abs(n))} mark${Math.abs(n) === 1 ? "" : "s"}`;
const list = (rows: TransitionRow[]) => rows.map((r) => `“${r.label}”`).join(", ");

export default function Comparison({
  first,
  second,
  attemptNo,
  onPractiseAnother,
  onReviewLostMarks,
  onReviseAgain,
  related,
}: {
  first: AttemptResult;
  second: AttemptResult;
  attemptNo: number;
  onPractiseAnother: () => void;
  onReviewLostMarks: () => void;
  onReviseAgain: () => void;
  /** Another question on the same chapter or paper, if there is one. */
  related?: { title: string; href: string };
}) {
  const c = useMemo(() => compareResults(first, second), [first, second]);
  const later = `Attempt ${attemptNo}`;

  const actions = (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Button onClick={onPractiseAnother}>
        Practise Another Question <Icon name="arrow" />
      </Button>
      <Button variant="secondary" onClick={onReviewLostMarks}>
        <Icon name="map" /> Review Lost Marks
      </Button>
      <Button variant="ghost" onClick={onReviseAgain}>
        <Icon name="edit" /> Revise {later} again
      </Button>
      {related && (
        <ButtonLink href={related.href} variant="ghost">
          <Icon name="notebook" /> Practise a related question: {related.title}
        </ButtonLink>
      )}
    </div>
  );

  if (!c.ok) {
    return (
      <Card className="space-y-4 p-5 sm:p-7">
        <h2 className="text-[1.5rem] font-bold">Attempt comparison</h2>
        <Alert tone="error" title="These attempts can't be compared">
          {c.reason}
        </Alert>
        {actions}
      </Card>
    );
  }

  const g = c.groups;
  return (
    <section aria-labelledby="cmp-heading" className="animate-fade-in space-y-5">
      {/* A. Score comparison */}
      <Card className="overflow-hidden">
        <div className="p-5 sm:p-7">
          <h2 id="cmp-heading" className="text-[1.5rem] font-bold">
            Attempt 1 vs {later}
          </h2>
          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:max-w-lg">
            <ScoreBox label="Attempt 1" value={c.marksBefore} max={c.maxMarks} muted />
            <Icon name="arrow" className="size-5 text-muted" />
            <ScoreBox label={later} value={c.marksAfter} max={c.maxMarks} />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Badge tone={c.direction === "up" ? "success" : c.direction === "down" ? "error" : "neutral"} className="px-3 py-1 text-sm">
              <Icon name={c.direction === "up" ? "up" : c.direction === "down" ? "down" : "minus"} className="size-3.5" />
              {c.direction === "same" ? "No change" : `${c.delta > 0 ? "+" : "−"}${marks(c.delta)}`}
            </Badge>
            <p className="text-[15px] text-ink">
              {c.direction === "up" && `Your score went up by ${marks(c.delta)}.`}
              {c.direction === "down" && `Your score went down by ${marks(c.delta)}. Something that earned marks before may have been removed or contradicted.`}
              {c.direction === "same" && "Your score didn't change. Adding length alone doesn't earn marks; each point has to be addressed."}
            </p>
          </div>
          <p className="mt-3 text-[13px] text-muted">
            Both scores are {first.aiUsed && second.aiUsed ? "AI-generated" : "automated"} practice estimates from the same marking scheme, not ICAI marks.
          </p>
          {c.mixedMarkers && (
            <Alert tone="attention" className="mt-3">
              One attempt was marked by the AI and the other by the rule-based fallback, so this comparison is less reliable than usual.
            </Alert>
          )}
        </div>
      </Card>

      {/* C. What improved */}
      <Card className="p-5 sm:p-7">
        <h3 className="text-card font-semibold">What Improved</h3>
        <ul className="mt-4 space-y-3 text-[15px] leading-relaxed">
          {g["newly-covered"].length > 0 && (
            <Summary icon="success" tone="text-success">
              <strong>Now fully addressed:</strong> {list(g["newly-covered"])}.
            </Summary>
          )}
          {g.improved.length > 0 && (
            <Summary icon="up" tone="text-brand">
              <strong>Better, but not complete yet:</strong> {list(g.improved)}.
            </Summary>
          )}
          {g.worse.length > 0 && (
            <Summary icon="error" tone="text-error">
              <strong>New problems:</strong> {list(g.worse)} scored lower or became incorrect in {later}. Check what you changed there.
            </Summary>
          )}
          {g["still-missing"].length > 0 && (
            <Summary icon="minus" tone="text-muted">
              <strong>Gaps that remain:</strong> {list(g["still-missing"])}. These are your next things to work on.
            </Summary>
          )}
          {g.unclear.length > 0 && (
            <Summary icon="alert" tone="text-warning">
              <strong>Held for review:</strong> {list(g.unclear)}. The marker couldn&apos;t back these with wording from your answer, so no change is claimed.
            </Summary>
          )}
          {g.kept.length > 0 && (
            <Summary icon="check" tone="text-muted">
              <strong>Still covered:</strong> {g.kept.length} point{g.kept.length === 1 ? "" : "s"} you already had.
            </Summary>
          )}
          {g["newly-covered"].length + g.improved.length === 0 && (
            <Summary icon="info" tone="text-muted">
              No marking point improved this time. Pick one gap from the list above and address it directly, in your own words.
            </Summary>
          )}
        </ul>
      </Card>

      {/* B + D. Point by point, with evidence from both attempts */}
      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-4 sm:px-7">
          <h3 className="text-card font-semibold">Marking point by marking point</h3>
          <p className="mt-0.5 text-sm text-muted">Open a point to compare what each attempt actually said.</p>
        </div>
        <ul className="divide-y divide-line">
          {c.rows.map((r) => (
            <Row key={r.pointId} r={r} later={later} />
          ))}
        </ul>
      </Card>

      {/* E. Next action */}
      <Card className="p-5 sm:p-7">
        <h3 className="font-display text-[16px] font-semibold">What next?</h3>
        <div className="mt-3">{actions}</div>
      </Card>
    </section>
  );
}

function ScoreBox({ label, value, max, muted }: { label: string; value: number; max: number; muted?: boolean }) {
  return (
    <div className={cn("rounded-card p-4 ring-1 ring-inset", muted ? "bg-canvas ring-line" : "bg-mint/50 ring-brand/15")}>
      <p className="text-[13px] text-muted">{label}</p>
      <p className={cn("font-display text-3xl font-bold tabular-nums", muted ? "text-muted" : "text-ink")}>
        {fmt(value)}
        <span className="text-base font-medium text-muted"> / {max}</span>
      </p>
    </div>
  );
}

function Summary({ icon, tone, children }: { icon: IconName; tone: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <Icon name={icon} className={cn("mt-1", tone)} />
      <p className="text-ink">{children}</p>
    </li>
  );
}

function Row({ r, later }: { r: TransitionRow; later: string }) {
  const [open, setOpen] = useState(false);
  const ch = CHANGE[r.change];
  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full flex-col gap-2 px-5 py-3.5 text-left transition-colors hover:bg-canvas/60 focus-visible:-outline-offset-2 sm:flex-row sm:items-center sm:gap-4 sm:px-7"
      >
        <p className="min-w-0 flex-1 text-[14px] font-medium text-ink">{r.label}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={OUTCOME[r.before.outcome].tone} className="text-[12px]">
            {OUTCOME[r.before.outcome].label} · {fmt(r.before.marks)}/{fmt(r.allocated)}
          </Badge>
          <Icon name="arrow" className="size-3.5 text-muted" />
          <Badge tone={OUTCOME[r.after.outcome].tone} className="text-[12px]">
            {OUTCOME[r.after.outcome].label} · {fmt(r.after.marks)}/{fmt(r.allocated)}
          </Badge>
          <Badge tone={ch.tone} className="text-[12px]">
            <Icon name={ch.icon} className="size-3" /> {ch.label}
          </Badge>
          <Icon name="chevron" className={cn("text-muted transition-transform", open && "rotate-90")} />
        </div>
      </button>
      {open && (
        <div className="grid gap-3 px-5 pb-4 sm:grid-cols-2 sm:px-7">
          <Evidence label="Attempt 1 wrote" quote={r.before.quote} />
          <Evidence label={`${later} wrote`} quote={r.after.quote} />
        </div>
      )}
    </li>
  );
}

function Evidence({ label, quote }: { label: string; quote: string | null }) {
  return (
    <div className="rounded-control bg-canvas p-3 ring-1 ring-inset ring-line">
      <p className="text-[12px] font-semibold text-muted">{label}</p>
      {quote ? (
        <p className="mt-1 text-[14px] leading-relaxed text-ink">“{quote}”</p>
      ) : (
        <p className="mt-1 text-[14px] text-muted">No supporting evidence found in this attempt.</p>
      )}
    </div>
  );
}
