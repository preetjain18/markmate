"use client";

import { forwardRef, useState } from "react";
import { countWords, MAX_ANSWER_CHARS } from "@/lib/answer";
import { cn } from "@/lib/ui";
import { Alert, Button, Card, Icon } from "../ui";
import { HandwritingUpload } from "./HandwritingUpload";

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
  /** Offer "upload your handwritten answer"; the question text helps the reader. */
  upload?: { question?: string };
  /** Called when the editor text came from photos (true) or the student cleared it (false). */
  onFromPhotos?: (fromPhotos: boolean) => void;
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
    upload,
    onFromPhotos,
    className,
  },
  ref,
) {
  const [showUpload, setShowUpload] = useState(false);
  const [readInfo, setReadInfo] = useState<{ pages: number; illegible: number } | null>(null);
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
          <div className="flex items-center gap-3">
            {upload && !locked && !unavailable && (
              <button
                type="button"
                onClick={() => setShowUpload((s) => !s)}
                aria-expanded={showUpload}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-control px-2 py-1 text-[13px] font-medium text-brand transition-colors hover:bg-mint disabled:opacity-50"
              >
                <Icon name="camera" /> {showUpload ? "Type instead" : "Answer on paper?"}
              </button>
            )}
            {maxMarks !== undefined && <span className="text-[13px] text-muted">Out of {maxMarks} marks</span>}
          </div>
        </div>
        {upload && showUpload && !locked && (
          <div className="px-5 pt-4">
            <HandwritingUpload
              question={upload.question}
              hasText={value.trim().length > 0}
              disabled={busy}
              onText={(text, info) => {
                onChange(text);
                setReadInfo(info);
                setShowUpload(false);
                onFromPhotos?.(true);
              }}
            />
          </div>
        )}
        {readInfo && !locked && value.trim() && (
          <div className="px-5 pt-4">
            <Alert tone="attention" title={`Read from ${readInfo.pages} photo${readInfo.pages === 1 ? "" : "s"}: please check it`}>
              Compare the text below with your sheet and fix anything that was misread before evaluating. Marks and quotes will be based on this text.
              {readInfo.illegible > 0 &&
                ` ${readInfo.illegible} word${readInfo.illegible === 1 ? "" : "s"} couldn't be read and ${readInfo.illegible === 1 ? "is" : "are"} marked [illegible].`}
            </Alert>
          </div>
        )}
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
          onChange={(e) => {
            onChange(e.target.value);
            if (!e.target.value.trim() && readInfo) {
              setReadInfo(null);
              onFromPhotos?.(false);
            }
          }}
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
