"use client";

/**
 * Upload photos of a handwritten answer sheet; the server reads them with the AI and the text is put in
 * the editor for the student to check and correct before evaluating. Nothing is marked from the photo directly.
 */
import { useRef, useState } from "react";
import { cn } from "@/lib/ui";
import { Alert, Button, Icon } from "../ui";

const MAX_PAGES = 4;
const MAX_SIDE = 1600;

type Page = { id: string; preview: string; data: string };

/** Shrinks a photo to at most 1600px on its longest side and re-encodes it as JPEG. */
async function toJpeg(file: File): Promise<Page> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("unreadable"));
      i.src = url;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("unreadable");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    return { id: `${file.name}-${file.size}-${Math.random()}`, preview: dataUrl, data: dataUrl.split(",")[1] };
  } finally {
    URL.revokeObjectURL(url);
  }
}

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
  const [pages, setPages] = useState<Page[]>([]);
  const [busy, setBusy] = useState<null | "preparing" | "reading">(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const room = MAX_PAGES - pages.length;
    const chosen = [...files].slice(0, room);
    if (files.length > room) setError(`You can upload up to ${MAX_PAGES} pages.`);
    setBusy("preparing");
    const ready: Page[] = [];
    for (const f of chosen) {
      try {
        ready.push(await toJpeg(f));
      } catch {
        setError(`“${f.name}” couldn't be opened. Use a JPG or PNG photo (iPhone: set Camera → Formats → Most Compatible).`);
      }
    }
    setPages((p) => [...p, ...ready]);
    setBusy(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function read() {
    if (!pages.length || busy) return;
    if (hasText && !window.confirm("Replace the text in the editor with the text read from your photos?")) return;
    setBusy("reading");
    setError("");
    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: pages.map((p) => ({ mimeType: "image/jpeg", data: p.data })), question }),
        signal: AbortSignal.timeout(65_000),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.text) throw new Error(data?.error || "Your handwriting couldn't be read right now. Please try again.");
      onText(data.text, { pages: pages.length, illegible: data.illegible ?? 0 });
      setPages([]);
    } catch (e) {
      const msg = (e as Error).name === "TimeoutError" ? "Reading took too long. Please try again." : (e as Error).message;
      setError(msg.startsWith("Failed to fetch") ? "Couldn't reach MarkMate. Check your internet connection and try again." : msg);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-control bg-canvas p-4 ring-1 ring-inset ring-line">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <p className="font-display text-[15px] font-semibold">Upload your handwritten answer</p>
        <p className="text-[12px] text-muted">Up to {MAX_PAGES} pages · JPG, PNG or WebP</p>
      </div>
      <p className="mt-1 text-[13px] text-muted">
        Photograph each page flat, in good light. MarkMate reads the handwriting, then you check the text before it&apos;s marked.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {pages.map((p, i) => (
          <figure key={p.id} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.preview} alt={`Page ${i + 1}`} className="h-24 w-20 rounded-[8px] object-cover ring-1 ring-line" />
            <figcaption className="absolute bottom-1 left-1 rounded bg-ink/75 px-1.5 text-[11px] text-white">{i + 1}</figcaption>
            <button
              type="button"
              onClick={() => setPages((ps) => ps.filter((x) => x.id !== p.id))}
              disabled={!!busy}
              aria-label={`Remove page ${i + 1}`}
              className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-surface text-ink shadow-soft ring-1 ring-line hover:bg-subtle"
            >
              <Icon name="x" className="size-3.5" />
            </button>
          </figure>
        ))}
        {pages.length < MAX_PAGES && (
          <label
            className={cn(
              "grid h-24 w-20 cursor-pointer place-items-center rounded-[8px] border border-dashed border-line-strong bg-surface text-center text-[12px] text-muted transition-colors hover:border-brand hover:text-brand",
              (disabled || busy) && "pointer-events-none opacity-50",
            )}
          >
            <span className="flex flex-col items-center gap-1">
              <Icon name="upload" className="size-5" />
              {pages.length ? "Add page" : "Add photo"}
            </span>
            <input ref={inputRef} type="file" accept="image/*" multiple className="sr-only" disabled={disabled || !!busy} onChange={(e) => addFiles(e.target.files)} />
          </label>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button type="button" onClick={read} disabled={!pages.length || !!busy || disabled} size="sm">
          {busy === "reading" ? (
            <>
              <Icon name="loader" className="animate-spin" /> Reading your handwriting…
            </>
          ) : busy === "preparing" ? (
            "Preparing photos…"
          ) : (
            <>
              <Icon name="scan" /> Read my handwriting
            </>
          )}
        </Button>
        <p className="text-[12px] text-muted">Photos go to Google Gemini for reading and aren&apos;t stored by MarkMate.</p>
      </div>

      {error && (
        <div className="mt-3" aria-live="polite">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
    </div>
  );
}
