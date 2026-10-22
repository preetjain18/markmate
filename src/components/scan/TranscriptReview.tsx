"use client";

/**
 * Side-by-side check of the scanned pages and the text read from them. Unreadable words are listed and
 * can be jumped to; the student can't continue until each [illegible] is fixed.
 */
import { useEffect, useRef, useState } from "react";
import { countWords, ILLEGIBLE } from "@/lib/answer";
import type { ScanFile } from "@/lib/scan";
import { cn } from "@/lib/ui";
import { Alert, Icon } from "../ui";

/** Browsers don't reliably show data: PDFs in frames, so show a temporary blob URL instead. */
function PdfFrame({ file, title }: { file: ScanFile; title: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const bin = atob(file.data);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const u = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url ? <iframe title={title} src={url} className="h-full w-full" /> : null;
}

export function TranscriptReview({
  files,
  text,
  onText,
  model,
  id = "transcript",
}: {
  files: ScanFile[];
  text: string;
  onText: (t: string) => void;
  model?: string;
  id?: string;
}) {
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const unreadable = text.split(ILLEGIBLE).length - 1;
  const f = files[Math.min(page, files.length - 1)];

  function jumpToNext() {
    const ta = ref.current;
    if (!ta) return;
    const from = ta.selectionEnd ?? 0;
    let at = text.indexOf(ILLEGIBLE, from);
    if (at < 0) at = text.indexOf(ILLEGIBLE);
    if (at < 0) return;
    ta.focus();
    ta.setSelectionRange(at, at + ILLEGIBLE.length);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* The scan */}
      <div className="min-w-0">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[13px] font-medium text-ink">Your scan</p>
          <div className="flex items-center gap-1">
            {files.length > 1 &&
              files.map((x, i) => (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => setPage(i)}
                  aria-current={i === page ? "true" : undefined}
                  className={cn("size-7 rounded-control text-[12px] font-medium transition-colors", i === page ? "bg-brand text-white" : "text-muted hover:bg-subtle")}
                >
                  {i + 1}
                </button>
              ))}
            {f?.kind === "image" && (
              <button type="button" onClick={() => setZoom((z) => !z)} className="ml-1 rounded-control px-2 py-1 text-[12px] font-medium text-brand hover:bg-mint">
                {zoom ? "Fit" : "Zoom"}
              </button>
            )}
          </div>
        </div>
        <div className={cn("overflow-auto rounded-card bg-subtle ring-1 ring-inset ring-line", "h-[22rem] lg:h-[34rem]")}>
          {f?.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={f.url} alt={`Scanned page ${page + 1}`} className={cn("mx-auto", zoom ? "max-w-none w-[180%]" : "h-full w-full object-contain")} />
          ) : f ? (
            <PdfFrame file={f} title={`Scanned PDF ${page + 1}`} />
          ) : null}
        </div>
      </div>

      {/* The text */}
      <div className="flex min-w-0 flex-col">
        <div className="mb-2 flex items-center justify-between gap-2">
          <label htmlFor={id} className="text-[13px] font-medium text-ink">
            What we read · edit anything that&apos;s wrong
          </label>
          <span className="text-[12px] tabular-nums text-muted">{countWords(text)} words</span>
        </div>
        <textarea
          ref={ref}
          id={id}
          value={text}
          onChange={(e) => onText(e.target.value)}
          className="block h-[22rem] w-full resize-y rounded-card bg-surface p-4 text-[16px] leading-[1.75] text-ink ring-1 ring-inset ring-line-strong focus:outline-none focus:ring-2 focus:ring-brand lg:h-[34rem]"
        />
        <div className="mt-3 space-y-2">
          {unreadable > 0 ? (
            <Alert tone="attention" title={`${unreadable} word${unreadable === 1 ? "" : "s"} couldn't be read`}>
              Each one is marked {ILLEGIBLE}. Replace it with what you wrote (or delete it) before continuing.{" "}
              <button type="button" onClick={jumpToNext} className="font-semibold text-brand underline underline-offset-2">
                Show me the next one
              </button>
            </Alert>
          ) : (
            <p className="flex items-center gap-1.5 text-[13px] text-success">
              <Icon name="success" /> Every word was read. Still compare it with your sheet before continuing.
            </p>
          )}
          {model && <p className="text-[12px] text-muted">Read by {model}. Marks and quotes will be based on this text, exactly as you leave it.</p>}
        </div>
      </div>
    </div>
  );
}
