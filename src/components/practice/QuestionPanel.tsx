"use client";

import { cn } from "@/lib/ui";
import { Badge, Card, Icon } from "../ui";

export type QuestionItem = { id: string; sa: string; topic: string; question: string; maxMarks: number; verified: boolean };

export const CUSTOM = "__custom__";

/** Question list: a side panel on large screens, a dropdown on small ones. */
export function QuestionPanel({
  questions,
  selected,
  onSelect,
  disabled,
}: {
  questions: QuestionItem[];
  selected: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  const unverified = questions.filter((q) => !q.verified).length;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-[15px] font-semibold">Questions</h2>
        <span className="text-[13px] text-muted">{questions.length} available</span>
      </div>
      {unverified > 0 && (
        <p className="mt-2 flex gap-1.5 text-[13px] leading-snug text-muted">
          <Icon name="info" className="mt-0.5 size-3.5" />
          {unverified === questions.length
            ? "Marking schemes are starter drafts for practice and have not been verified by a CA."
            : `${unverified} of these marking schemes are starter drafts not yet verified by a CA.`}
        </p>
      )}

      {/* Small screens */}
      <div className="mt-3 lg:hidden">
        <label htmlFor="question-select" className="sr-only">
          Choose a question
        </label>
        <select
          id="question-select"
          value={selected}
          disabled={disabled}
          onChange={(e) => onSelect(e.target.value)}
          className="h-11 w-full rounded-control bg-surface px-3 text-[15px] text-ink ring-1 ring-inset ring-line-strong focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-60"
        >
          {questions.map((q, i) => (
            <option key={q.id} value={q.id}>
              Q{i + 1} · {q.sa} · {q.topic} ({q.maxMarks} marks)
            </option>
          ))}
          <option value={CUSTOM}>Your own question</option>
        </select>
      </div>

      {/* Large screens */}
      <Card className="mt-3 hidden overflow-hidden lg:block">
        <ul className="max-h-[calc(100vh-15rem)] divide-y divide-line overflow-y-auto" aria-label="Questions">
          {questions.map((q, i) => {
            const on = selected === q.id;
            return (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() => onSelect(q.id)}
                  disabled={disabled}
                  aria-current={on ? "true" : undefined}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors focus-visible:-outline-offset-2 disabled:cursor-not-allowed",
                    on ? "bg-mint" : "hover:bg-canvas disabled:hover:bg-transparent",
                  )}
                >
                  <span className={cn("mt-0.5 w-7 shrink-0 font-mono text-[12px]", on ? "text-brand" : "text-muted")}>Q{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-[14px] leading-snug", on ? "font-semibold text-brand" : "font-medium text-ink")}>{q.topic}</span>
                    <span className="mt-0.5 block text-[13px] text-muted">
                      {q.sa} · {q.maxMarks} marks
                    </span>
                  </span>
                  {on && <Icon name="chevron" className="mt-1 text-brand" />}
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => onSelect(CUSTOM)}
              disabled={disabled}
              aria-current={selected === CUSTOM ? "true" : undefined}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left text-[14px] transition-colors focus-visible:-outline-offset-2 disabled:cursor-not-allowed",
                selected === CUSTOM ? "bg-mint font-semibold text-brand" : "font-medium text-muted hover:bg-canvas hover:text-ink",
              )}
            >
              <Icon name="edit" className="w-7" /> Your own question
            </button>
          </li>
        </ul>
      </Card>
    </div>
  );
}

const HOW_TO = [
  "Write in your own words, the way you would in the exam.",
  "Use short paragraphs or numbered points, one idea at a time.",
  "Refer to the relevant Standard on Auditing where it applies.",
  "Cover every part of the question. Length alone earns nothing.",
];

/** The selected question, its marks, its marking-scheme status and answering instructions. */
export function QuestionCard({ q, index }: { q: QuestionItem; index: number }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand">{q.sa}</Badge>
        <Badge tone="neutral">{q.maxMarks} marks</Badge>
        {q.verified ? (
          <Badge tone="success">
            <Icon name="shield" className="size-3.5" /> Verified marking scheme
          </Badge>
        ) : (
          <Badge tone="neutral">
            <Icon name="info" className="size-3.5" /> Unverified marking scheme
          </Badge>
        )}
      </div>
      <p className="mt-4 text-[13px] font-medium text-muted">
        Question {index + 1} · {q.topic}
      </p>
      <h2 className="mt-1 font-sans text-[18px] font-medium leading-relaxed tracking-normal sm:text-[19px]">{q.question}</h2>

      <details className="group mt-5 rounded-control bg-canvas ring-1 ring-inset ring-line">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-control px-4 py-2.5 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
          <Icon name="chevron" className="text-muted transition-transform group-open:rotate-90" /> How to answer
        </summary>
        <ul className="space-y-1.5 px-4 pb-3.5 pl-10 text-sm text-muted">
          {HOW_TO.map((t) => (
            <li key={t} className="list-disc">
              {t}
            </li>
          ))}
        </ul>
      </details>
    </Card>
  );
}
