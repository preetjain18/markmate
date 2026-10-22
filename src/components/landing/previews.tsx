/**
 * Illustrative product previews for the landing page. All content here is sample data,
 * labelled as such on screen, and built from the same design-system pieces the app uses.
 */
import type { Status } from "@/lib/schema";
import { cn, fmt, STATUS_META } from "@/lib/ui";
import { Badge, Card, Icon, ScoreRing } from "../ui";

export const SAMPLE = {
  level: "CA Foundation",
  paper: "Business Laws",
  question: "What are the essential elements of a valid contract under the Indian Contract Act, 1872?",
  answer: [
    { text: "A contract is an agreement enforceable by law. " },
    { text: "There must be a lawful offer and its acceptance between the parties.", status: "correct_complete" as Status },
    { text: " " },
    { text: "Both parties should agree freely", status: "correct_incomplete" as Status },
    { text: ", and then the contract will be valid." },
  ],
  points: [
    {
      label: "Offer and acceptance",
      status: "correct_complete" as Status,
      marks: 1,
      allocated: 1,
      quote: "There must be a lawful offer and its acceptance between the parties.",
    },
    {
      label: "Free consent",
      status: "correct_incomplete" as Status,
      marks: 0.5,
      allocated: 1,
      quote: "Both parties should agree freely",
      reason: "Says the parties should agree freely, but not what makes consent not free.",
      fix: "Add that consent must not be caused by coercion, undue influence, fraud, misrepresentation or mistake.",
    },
    {
      label: "Competent parties",
      status: "not_addressed" as Status,
      marks: 0,
      allocated: 1,
      reason: "The answer never says who is allowed to make a contract.",
      fix: "Add that the parties must be competent: of the age of majority, of sound mind and not disqualified by law.",
    },
  ],
};

export function SampleLabel({ className, children = "Sample preview · illustrative content" }: { className?: string; children?: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-subtle px-2.5 py-1 text-[12px] font-medium text-muted", className)}>
      <Icon name="info" className="size-3.5" /> {children}
    </span>
  );
}

function StudentAnswer({ className }: { className?: string }) {
  return (
    <p className={cn("text-[14px] leading-7 text-ink", className)}>
      {SAMPLE.answer.map((s, i) =>
        s.status ? (
          <mark key={i} className={STATUS_META[s.status].mark}>
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </p>
  );
}

/** Compact evaluation card for the hero. */
export function HeroPreview() {
  const got = SAMPLE.points.reduce((s, p) => s + p.marks, 0);
  const max = SAMPLE.points.reduce((s, p) => s + p.allocated, 0);
  return (
    <Card className="overflow-hidden shadow-lift">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line px-5 py-3">
        <div className="flex items-center gap-2">
          <Badge tone="brand">{SAMPLE.paper}</Badge>
          <span className="whitespace-nowrap text-[13px] text-muted">{SAMPLE.level}</span>
        </div>
        <SampleLabel />
      </div>

      <div className="space-y-4 p-5">
        <div>
          <p className="text-[12px] font-medium text-muted">Question</p>
          <p className="mt-1 text-[14px] font-medium leading-relaxed text-ink">{SAMPLE.question}</p>
        </div>
        <div className="rounded-control bg-canvas p-3.5 ring-1 ring-inset ring-line">
          <p className="text-[12px] font-medium text-muted">Student&apos;s answer</p>
          <StudentAnswer className="mt-1" />
        </div>

        <div className="flex items-center gap-4">
          <ScoreRing value={got} max={max} size={68} />
          <div>
            <p className="font-display text-[15px] font-semibold text-ink">
              You scored {fmt(got)} out of {max}
            </p>
            <p className="text-[13px] text-muted">1 point done well · 1 half done · 1 missed</p>
          </div>
        </div>

        <ul className="space-y-2">
          {SAMPLE.points.map((p) => {
            const m = STATUS_META[p.status];
            return (
              <li key={p.label} className="relative overflow-hidden rounded-control bg-surface py-2.5 pl-4 pr-3 ring-1 ring-inset ring-line">
                <span className={cn("absolute inset-y-0 left-0 w-1", m.bar)} />
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-[13px] font-medium text-ink">{p.label}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={m.tone} className="text-[12px]">
                      {m.label}
                    </Badge>
                    <span className="w-12 text-right font-mono text-[12px] tabular-nums text-muted">
                      {fmt(p.marks)}/{p.allocated}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}

/** Larger preview: student's wording → marking point → why marks were lost → what to write instead. */
export function FeedbackTracePreview() {
  const p = SAMPLE.points[1];
  const m = STATUS_META[p.status];
  const steps = [
    {
      icon: "quote" as const,
      label: "What you wrote",
      body: (
        <p className="text-[15px] leading-relaxed">
          <mark className={m.mark}>“{p.quote}”</mark>
        </p>
      ),
    },
    {
      icon: "checklist" as const,
      label: "Marking point",
      body: (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[15px] font-medium text-ink">{p.label}</p>
          <Badge tone={m.tone} dot>
            {m.label} · {fmt(p.marks)}/{p.allocated}
          </Badge>
        </div>
      ),
    },
    { icon: "alert" as const, label: "Why marks were lost", body: <p className="text-[15px] leading-relaxed text-ink">{p.reason}</p> },
    {
      icon: "idea" as const,
      label: "To recover the mark",
      body: <p className="text-[15px] leading-relaxed text-brand">{p.fix}</p>,
    },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
      <Card className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="font-display text-[15px] font-semibold">Your answer, annotated</p>
          <Badge tone="brand">{SAMPLE.paper}</Badge>
        </div>
        <p className="mt-3 text-[14px] text-muted">{SAMPLE.question}</p>
        <div className="mt-4 rounded-control bg-canvas p-4 ring-1 ring-inset ring-line">
          <StudentAnswer className="text-[15px] leading-8" />
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-muted">
          <span className="flex items-center gap-1.5">
            <mark className="evidence">text</mark> earned the mark
          </span>
          <span className="flex items-center gap-1.5">
            <mark className="evidence evidence-partial">text</mark> partly earned
          </span>
          <span>Plain text earned nothing</span>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <p className="font-display text-[15px] font-semibold">One point, traced end to end</p>
        <ol className="mt-5">
          {steps.map((s, i) => (
            <li key={s.label} className="relative flex gap-4 pb-6 last:pb-0">
              {i < steps.length - 1 && <span aria-hidden className="absolute left-[17px] top-10 bottom-1 w-px bg-line" />}
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-mint text-brand">
                <Icon name={s.icon} />
              </span>
              <div className="min-w-0 pt-1">
                <p className="text-[13px] font-medium text-muted">{s.label}</p>
                <div className="mt-1">{s.body}</div>
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

/** Small visual for the Lost Marks Map feature card. */
export function MapMini() {
  return (
    <div className="space-y-2">
      {SAMPLE.points.map((p) => {
        const m = STATUS_META[p.status];
        return (
          <div key={p.label} className="flex items-center gap-3 rounded-control bg-surface px-3 py-2.5 ring-1 ring-inset ring-line">
            <span className={cn("size-2 shrink-0 rounded-full", m.dot)} />
            <p className="min-w-0 flex-1 truncate text-[13px] text-ink">{p.label}</p>
            <span className={cn("text-[12px] font-medium", m.tone === "success" ? "text-success" : m.tone === "attention" ? "text-warning" : "text-muted")}>{m.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Small visual for the Improvement Lab feature card. Sample numbers only. */
export function AttemptsMini() {
  const rows: { label: string; from: number; to: number; kind: string; tone: "success" | "neutral" }[] = [
    { label: "Free consent", from: 0.5, to: 1, kind: "Improved", tone: "success" },
    { label: "Competent parties", from: 0, to: 1, kind: "Recovered", tone: "success" },
    { label: "Lawful object", from: 0, to: 0, kind: "Still missing", tone: "neutral" },
  ];
  return (
    <div className="rounded-control bg-surface ring-1 ring-inset ring-line">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span className="font-display text-xl font-bold tabular-nums text-muted">2.5</span>
        <Icon name="arrow" className="text-muted" />
        <span className="font-display text-xl font-bold tabular-nums text-ink">4</span>
        <span className="text-[13px] text-muted">/ 5</span>
        <Badge tone="success" className="ml-auto">
          +1.5 marks
        </Badge>
      </div>
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-3 px-4 py-2.5">
            <p className="min-w-0 flex-1 truncate text-[13px] text-ink">{r.label}</p>
            <span className="font-mono text-[12px] tabular-nums text-muted">
              {fmt(r.from)} → {fmt(r.to)}
            </span>
            <Badge tone={r.tone} className="w-[6.5rem] justify-center text-[12px]">
              {r.kind}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
