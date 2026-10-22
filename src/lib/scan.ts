/**
 * Browser-side helpers for scanning answer sheets: preparing photos/PDFs and sending them to
 * /api/transcribe with upload progress. Nothing here is stored; files live only in page memory.
 */

export const SCAN_MAX_FILES = 4;
/** Keep the request under the server limit (base64 characters, all files together). */
export const SCAN_MAX_BASE64 = 4_000_000;
const MAX_SIDE = 1600;

export type ScanFile = {
  id: string;
  name: string;
  kind: "image" | "pdf";
  mimeType: "image/jpeg" | "application/pdf";
  /** base64 without the data: prefix */
  data: string;
  /** data: URL for showing it (JPEG for images, PDF for PDFs) */
  url: string;
  /** Pages in this file (1 for a photo; estimated for a PDF). */
  pages: number;
};

export type Transcript = { text: string; illegible: number; model: string };

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `f-${Date.now()}-${Math.random()}`);

/** Shrinks a photo to at most 1600px on its longest side and re-encodes it as JPEG. */
async function prepareImage(file: File): Promise<ScanFile> {
  const src = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("unreadable"));
      i.src = src;
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
    const url = canvas.toDataURL("image/jpeg", 0.82);
    return { id: uid(), name: file.name, kind: "image", mimeType: "image/jpeg", data: url.split(",")[1], url, pages: 1 };
  } finally {
    URL.revokeObjectURL(src);
  }
}

/** Reads a PDF as-is and estimates its page count from the file structure. */
async function preparePdf(file: File): Promise<ScanFile> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  if (!bin.startsWith("%PDF")) throw new Error("not a pdf");
  const pages = Math.max(1, (bin.match(/\/Type\s*\/Page(?!s)/g) ?? []).length);
  const data = btoa(bin);
  return { id: uid(), name: file.name, kind: "pdf", mimeType: "application/pdf", data, url: `data:application/pdf;base64,${data}`, pages };
}

export function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

/** Prepares one picked file, or explains why it can't be used. */
export async function prepareFile(file: File): Promise<ScanFile> {
  if (isPdf(file)) {
    try {
      return await preparePdf(file);
    } catch {
      throw new Error(`“${file.name}” isn't a readable PDF.`);
    }
  }
  if (!file.type.startsWith("image/")) throw new Error(`“${file.name}” isn't a photo or PDF. Use JPG, PNG, WebP or PDF.`);
  try {
    return await prepareImage(file);
  } catch {
    throw new Error(`“${file.name}” couldn't be opened. Use JPG or PNG (on iPhone: Settings → Camera → Formats → Most Compatible).`);
  }
}

export const totalBase64 = (files: ScanFile[]) => files.reduce((s, f) => s + f.data.length, 0);
export const totalPages = (files: ScanFile[]) => files.reduce((s, f) => s + f.pages, 0);

/**
 * Sends files to /api/transcribe and reports upload progress (0–100) while sending.
 * Rejects with a message a student can act on.
 */
export function readScan(
  files: ScanFile[],
  opts: { question?: string; mode?: "answer" | "question"; onProgress?: (pct: number) => void },
): Promise<Transcript> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/transcribe");
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.timeout = 70_000;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let data: { text?: string; illegible?: number; model?: string; error?: string } | null = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && data?.text) resolve({ text: data.text, illegible: data.illegible ?? 0, model: data.model ?? "" });
      else reject(new Error(data?.error || "Your handwriting couldn't be read right now. Please try again."));
    };
    xhr.onerror = () => reject(new Error("Couldn't reach MarkMate. Check your internet connection and try again."));
    xhr.ontimeout = () => reject(new Error("Reading took too long. Please try again."));
    xhr.send(JSON.stringify({ images: files.map((f) => ({ mimeType: f.mimeType, data: f.data })), question: opts.question, mode: opts.mode ?? "answer" }));
  });
}
