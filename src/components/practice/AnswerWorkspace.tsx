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
  hasResult: boolean;
  /** Set when this question cannot be evaluated (no rubric yet). Writing still works; evaluating is blocked. */
  unavailable?: string;
};

/** The main answer editor with word count, instructions, validation and the Evaluate button. */
export const AnswerWorkspace = forwardRef<HTMLTextAreaElement, Props>(function AnswerWorkspace(
  { value, onChange, onSubmit, maxMarks, busy, problem, hasResult, unavailable },
  ref,
) {
  const words = countWords(value);
  const chars = value.trim().length;
  const nearLimit = chars > MAX_ANSWER_CHARS * 0.85;
  return (
    <Card className={cn("overflow-hidden transition-shadow focus-within:ring-2", problem ? "focus-within:ring-error" : "focus-within:ring-brand")}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <label htmlFor="answer" className="font-display text-[15px] font-semibold">
            Your answer
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
        <p id="answer-help" className="px-5 pt-3 text-[13px] text-muted">
          Answer in your own words. Marks are only given for points your answer actually makes.
        </p>
        <textarea
          ref={ref}
          id="answer"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={busy}
          rows={14}
          placeholder="Write your answer here…"
          aria-describedby={cn("answer-help", problem && "answer-error")}
          aria-invalid={problem ? true : undefined}
          className="block min-h-[18rem] w-full resize-y bg-surface px-5 py-3 text-[16px] leading-[1.75] text-ink outline-none placeholder:text-muted/70 read-only:text-ink/70 sm:min-h-[22rem]"
        />
        {problem && (
          <p id="answer-error" role="alert" className="flex items-center gap-1.5 px-5 pb-2 text-sm font-medium text-error">
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
            <span> · Draft kept in this browser</span>
          </p>
          <Button type="submit" disabled={busy || !!unavailable} aria-busy={busy} className="w-full sm:w-auto">
            {busy ? (
              <>
                <Icon name="loader" className="animate-spin" /> Evaluating…
              </>
            ) : unavailable ? (
              "Evaluation not available"
            ) : (
              <>
                {hasResult ? "Evaluate Again" : "Evaluate My Answer"} <Icon name="arrow" />
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
});
