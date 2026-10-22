"use client";

/**
 * Upload photos or a PDF of a handwritten answer inside the editor; the text that's read is put in the
 * editor for the student to check and correct before evaluating. Nothing is marked from the scan directly.
 * For a side-by-side check against the scan, students can use the full Scan My Answer page.
 */
import Link from "next/link";
import { useState } from "react";
import { readScan, type ScanFile } from "@/lib/scan";
import { Alert, Button, Icon } from "../ui";
import { PageUploader } from "../scan/PageUploader";

export function HandwritingUpload({
  question,
  hasText,
  onText,
  disabled,
}: {
  question?: string;
  hasText: boolean;
  onText: (text: string, info: { pages: number; illegible: number }) => void;
  disabled?: boolean;
}) {
  const [files, setFiles] = useState<ScanFile[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");

  async function read() {
    if (!files.length || reading) return;
    if (hasText && !window.confirm("Replace the text in the editor with the text read from your scan?")) return;
    setReading(true);
    setError("");
    setProgress(0);
    try {
      const t = await readScan(files, { question, onProgress: setProgress });
      onText(t.text, { pages: files.reduce((s, f) => s + f.pages, 0), illegible: t.illegible });
      setFiles([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReading(false);
      setProgress(null);
    }
  }

  return (
    <div className="space-y-3 rounded-card bg-canvas p-4 ring-1 ring-inset ring-line">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <p className="font-display text-[15px] font-semibold">Upload your handwritten answer</p>
        <Link href="/scan" className="text-[12px] font-medium text-brand hover:underline">
          Prefer a side-by-side check? Use Scan My Answer
        </Link>
      </div>
      <PageUploader files={files} onChange={setFiles} disabled={disabled || reading} />
      {reading && (
        <div aria-live="polite" className="space-y-1.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-subtle">
            <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${progress !== null && progress < 100 ? progress : 100}%` }} />
          </div>
          <p className="text-[12px] text-muted">{progress !== null && progress < 100 ? `Uploading… ${progress}%` : "Reading your handwriting…"}</p>
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button type="button" onClick={read} disabled={!files.length || reading || disabled} size="sm">
          {reading ? (
            <>
              <Icon name="loader" className="animate-spin" /> Reading…
            </>
          ) : (
            <>
              <Icon name="scan" /> Read my handwriting
            </>
          )}
        </Button>
        <p className="text-[12px] text-muted">Files go to Google Gemini for reading and aren&apos;t stored by MarkMate.</p>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}
