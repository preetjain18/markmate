"use client";

import { forwardRef } from "react";
import { countWords, MAX_ANSWER_CHARS } from "@/lib/answer";
import { cn } from "@/lib/ui";
import { Alert, Button, Card, Icon } from "../ui";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  maxMarks?: number;
  busy: boolean;
  /** Validation message shown under the editor (empty answer, too short, ...). */
  problem: string | null;
  /** Element id for the textarea (also used for focus and help/error ids). */
  id?: string;
  label?: string;
  help?: string;
  submitLabel?: string;
  /** Short note in the footer, e.g. where the draft is kept. Only pass it when it's true. */
  savedNote?: string;
  /** Set when this question cannot be evaluated (no rubric yet). Writing still works; evaluating is blocked. */
  unavailable?: string;
  /** Once evaluated, an attempt is read-only. Starting over is an explicit choice. */
  locked?: { message: string; onStartOver: () => void };
  className?: string;
};

/** An answer editor with word count, instructions, validation and a submit button. Used for Attempt 1 and rewrites. */
export const AnswerWorkspace = forwardRef<HTMLTextAreaElement, Props>(function AnswerWorkspace(
  {
    value,
    onChange,
    onSubmit,
    maxMarks,
    busy,
    problem,
    id = "answer",
    label = "Your answer",
    help = "Answer in your own words. Marks are only given for points your answer actually makes.",
    submitLabel = "Evaluate My Answer",
    savedNote,
    unavailable,
    locked,
    className,
  },
  ref,
) {
  const words = countWords(value);
  const chars = value.trim().length;
  const nearLimit = chars > MAX_ANSWER_CHARS * 0.85;
  const readOnly = busy || !!locked;
  return (
    <Card className={cn("overflow-hidden transition-shadow", !readOnly && "focus-within:ring-2", problem ? "focus-within:ring-error" : "focus-within:ring-brand", className)}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!locked) onSubmit();
        }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <label htmlFor={id} className="flex items-center gap-2 font-display text-[15px] font-semibold">
            {locked && <Icon name="shield" className="text-muted" />}
            {label}
          </label>
          {maxMarks !== undefined && <span className="text-[13px] text-muted">Out of {maxMarks} marks</span>}
        </div>
        {unavailable && (
          <div className="px-5 pt-4">
            <Alert tone="attention" title="Evaluation isn't available for this question yet">
              {unavailable}
            </Alert>
          </div>
        )}
        <p id={`${id}-help`} className="px-5 pt-3 text-[13px] text-muted">
          {locked ? locked.message : help}
        </p>
        <textarea
          ref={ref}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          rows={14}
          placeholder="Write your answer here…"
          aria-describedby={cn(`${id}-help`, problem && `${id}-error`)}
          aria-invalid={problem ? true : undefined}
          className={cn(
            "block min-h-[18rem] w-full resize-y px-5 py-3 text-[16px] leading-[1.75] text-ink outline-none placeholder:text-muted/70 sm:min-h-[22rem]",
            locked ? "bg-canvas text-ink/80" : "bg-surface read-only:text-ink/70",
          )}
        />
        {problem && (
          <p id={`${id}-error`} role="alert" className="flex items-center gap-1.5 px-5 pb-2 text-sm font-medium text-error">
            <Icon name="error" /> {problem}
          </p>
        )}
        <div className="flex flex-col gap-3 border-t border-line bg-canvas px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] tabular-nums text-muted" aria-live="off">
            {words} {words === 1 ? "word" : "words"}
            {nearLimit && (
              <span className={cn(chars > MAX_ANSWER_CHARS && "font-medium text-error")}>
                {" "}
                · {chars.toLocaleString("en-IN")} / {MAX_ANSWER_CHARS.toLocaleString("en-IN")} characters
              </span>
            )}
            {savedNote && <span> · {savedNote}</span>}
          </p>
          {locked ? (
            <Button type="button" variant="secondary" size="sm" onClick={locked.onStartOver} disabled={busy} className="w-full sm:w-auto">
              <Icon name="refresh" /> Start over
            </Button>
          ) : (
            <Button type="submit" disabled={busy || !!unavailable} aria-busy={busy} className="w-full sm:w-auto">
              {busy ? (
                <>
                  <Icon name="loader" className="animate-spin" /> Evaluating…
                </>
              ) : unavailable ? (
                "Evaluation not available"
              ) : (
                <>
                  {submitLabel} <Icon name="arrow" />
                </>
              )}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
});
