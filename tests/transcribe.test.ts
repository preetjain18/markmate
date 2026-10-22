/**
 * Handwriting reading. Mocked model and network: proves validation, request shape and error handling,
 * not real handwriting accuracy (that needs a live Gemini call with photos).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { answerProblem } from "@/lib/answer";
import { callModel, type ModelCaller } from "@/lib/llm";
import { NotAnAnswerError, transcribe } from "@/lib/transcribe";

const img = { mimeType: "image/jpeg", data: "A".repeat(200) };
const post = (body: unknown) => new Request("http://x/api/transcribe", { method: "POST", body: JSON.stringify(body) });

describe("transcribe()", () => {
  it("sends the photos to the model and returns the text as read", async () => {
    let seen: Parameters<ModelCaller>[0] | null = null;
    const m: ModelCaller = async (r) => {
      seen = r;
      return { data: { text: "  Going concern means...  ", illegible: 1, isAnswer: true }, model: "gemini-mock" };
    };
    const t = await transcribe([img, img], m, "Explain SA 570.");
    expect(t).toEqual({ text: "Going concern means...", illegible: 1, isAnswer: true, model: "gemini-mock" });
    expect(seen!.images).toHaveLength(2);
    expect(seen!.user).toContain("Explain SA 570.");
  });

  it("refuses photos that don't contain an answer", async () => {
    const m: ModelCaller = async () => ({ data: { text: "", illegible: 0, isAnswer: false }, model: "m" });
    await expect(transcribe([img], m)).rejects.toBeInstanceOf(NotAnAnswerError);
  });

  it("retries once on a malformed reply, then gives up", async () => {
    let calls = 0;
    const m: ModelCaller = async () => (calls++, { data: "garbage", model: "m" });
    await expect(transcribe([img], m)).rejects.toThrow(/couldn't be read/);
    expect(calls).toBe(2);
  });
});

describe("Gemini request with images", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
  });
  afterEach(() => vi.unstubAllGlobals());

  it("adds each photo as inline data after the text", async () => {
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "{}" }] } }] }), { status: 200 }));
    vi.stubGlobal("fetch", f);
    await callModel({ system: "s", user: "u", schema: {}, schemaName: "t", images: [img] });
    const parts = JSON.parse(f.mock.calls[0][1].body).contents[0].parts;
    expect(parts[0]).toEqual({ text: "u" });
    expect(parts[1]).toEqual({ inlineData: { mimeType: "image/jpeg", data: img.data } });
  });
});

describe("/api/transcribe", () => {
  const env = process.env as Record<string, string | undefined>;
  afterEach(() => {
    env.GEMINI_API_KEY = "test-key";
  });

  it("rejects missing or unsupported images", async () => {
    const { POST } = await import("@/app/api/transcribe/route");
    expect((await POST(post({ images: [] }))).status).toBe(400);
    expect((await POST(post({ images: [{ mimeType: "image/gif", data: img.data }] }))).status).toBe(400);
    expect((await POST(post({ images: Array(5).fill(img) }))).status).toBe(400);
  });

  it("rejects photos that are too large together", async () => {
    const { POST } = await import("@/app/api/transcribe/route");
    const big = { mimeType: "image/jpeg", data: "A".repeat(1_100_000) };
    expect((await POST(post({ images: [big, big, big, big] }))).status).toBe(413);
  });

  it("says clearly when the AI isn't set up, instead of guessing", async () => {
    const { POST } = await import("@/app/api/transcribe/route");
    delete env.GEMINI_API_KEY;
    const res = await POST(post({ images: [img] }));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/needs the AI/);
  });
});

describe("illegible words", () => {
  it("must be fixed before an answer can be evaluated", () => {
    expect(answerProblem("Going concern means the company will continue [illegible] for twelve months.")).toMatch(/couldn't be read/);
  });
});
