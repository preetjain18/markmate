"use client";

/**
 * Drag-and-drop page uploader for answer sheets: photos or PDFs, with page order, replace and remove.
 * Used by the /scan journey and the "Answer on paper?" panel in the editor.
 */
import { useRef, useState } from "react";
import { prepareFile, SCAN_MAX_BASE64, SCAN_MAX_FILES, totalBase64, totalPages, type ScanFile } from "@/lib/scan";
import { cn } from "@/lib/ui";
import { Alert, Icon } from "../ui";

export function PageUploader({
  files,
  onChange,
  disabled,
  label = "answer sheet",
}: {
  files: ScanFile[];
  onChange: (files: ScanFile[]) => void;
  disabled?: boolean;
  label?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const addRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replaceId = useRef<string | null>(null);

  async function add(list: FileList | File[] | null, replacing?: string) {
    if (!list || !list.length || disabled) return;
    const errs: string[] = [];
    const room = replacing ? 1 : SCAN_MAX_FILES - files.length;
    const chosen = [...list].slice(0, Math.max(0, room));
    if (!replacing && list.length > room) errs.push(`You can add up to ${SCAN_MAX_FILES} files. ${list.length - room} not added.`);
    setPreparing(true);
    const ready: ScanFile[] = [];
    for (const f of chosen) {
      try {
        ready.push(await prepareFile(f));
      } catch (e) {
        errs.push((e as Error).message);
      }
    }
    let next = replacing ? files.map((f) => (f.id === replacing && ready[0] ? ready[0] : f)) : [...files, ...ready];
    if (totalBase64(next) > SCAN_MAX_BASE64) {
      errs.push("Those files are too large together (limit about 3 MB). Use fewer pages or a smaller PDF.");
      next = files;
    }
    onChange(next);
    setErrors(errs);
    setPreparing(false);
  }

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= files.length) return;
    const n = [...files];
    [n[i], n[j]] = [n[j], n[i]];
    onChange(n);
  };

  const pages = totalPages(files);
  const sizeKb = Math.round((totalBase64(files) * 0.75) / 1024);

  return (
    <div className="space-y-3">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void add(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed px-6 py-8 text-center transition-colors",
          dragging ? "border-brand bg-mint/60" : "border-line-strong bg-surface hover:border-brand/60 hover:bg-canvas",
          (disabled || preparing || files.length >= SCAN_MAX_FILES) && "pointer-events-none opacity-60",
        )}
      >
        <span className="grid size-12 place-items-center rounded-full bg-mint text-brand">
          <Icon name={preparing ? "loader" : "upload"} className={cn("size-6", preparing && "animate-spin")} />
        </span>
        <span className="mt-3 font-display text-[16px] font-semibold text-ink">
          {preparing ? "Preparing your files…" : files.length >= SCAN_MAX_FILES ? `${SCAN_MAX_FILES} files added` : `Drop your ${label} here`}
        </span>
        <span className="mt-1 text-[14px] text-muted">
          or <span className="font-medium text-brand underline underline-offset-2">choose photos or a PDF</span>
        </span>
        <span className="mt-2 text-[12px] text-muted">JPG, PNG, WebP or PDF · up to {SCAN_MAX_FILES} files · about 3 MB in total</span>
        <input
          ref={addRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="sr-only"
          disabled={disabled || preparing}
          onChange={(e) => {
            void add(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      <input
        ref={replaceRef}
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          void add(e.target.files, replaceId.current ?? undefined);
          e.target.value = "";
        }}
      />

      {files.length > 0 && (
        <div>
          <p className="mb-2 text-[13px] text-muted" aria-live="polite">
            {files.length} file{files.length === 1 ? "" : "s"} · {pages} page{pages === 1 ? "" : "s"} · {sizeKb} KB · read in this order
          </p>
          <ol className="space-y-2">
            {files.map((f, i) => (
              <li key={f.id} className="flex items-center gap-3 rounded-control bg-surface p-2 pr-3 ring-1 ring-inset ring-line">
                <span className="w-6 text-center font-mono text-[13px] text-muted">{i + 1}</span>
                {f.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.url} alt={`Page ${i + 1}`} className="h-14 w-11 shrink-0 rounded-[6px] object-cover ring-1 ring-line" />
                ) : (
                  <span className="grid h-14 w-11 shrink-0 place-items-center rounded-[6px] bg-error-soft text-[11px] font-bold text-error ring-1 ring-line">PDF</span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-ink">{f.name}</p>
                  <p className="text-[12px] text-muted">{f.kind === "pdf" ? `PDF · about ${f.pages} page${f.pages === 1 ? "" : "s"}` : "Photo · 1 page"}</p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <IconButton label={`Move ${f.name} up`} icon="up" onClick={() => move(i, -1)} disabled={disabled || i === 0} />
                  <IconButton label={`Move ${f.name} down`} icon="down" onClick={() => move(i, 1)} disabled={disabled || i === files.length - 1} />
                  <IconButton
                    label={`Replace ${f.name}`}
                    icon="refresh"
                    onClick={() => {
                      replaceId.current = f.id;
                      replaceRef.current?.click();
                    }}
                    disabled={disabled}
                  />
                  <IconButton label={`Remove ${f.name}`} icon="x" onClick={() => onChange(files.filter((x) => x.id !== f.id))} disabled={disabled} />
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {errors.length > 0 && (
        <Alert tone="error" title="Some files weren't added">
          <ul className="list-disc pl-4">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Alert>
      )}
    </div>
  );
}

function IconButton({ label, icon, onClick, disabled }: { label: string; icon: "up" | "down" | "refresh" | "x"; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center rounded-control text-muted transition-colors hover:bg-subtle hover:text-ink disabled:pointer-events-none disabled:opacity-30"
    >
      <Icon name={icon} />
    </button>
  );
}
