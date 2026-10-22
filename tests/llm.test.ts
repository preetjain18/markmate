/**
 * Gemini client behaviour with a mocked network. These prove the error handling and request shape;
 * they do NOT prove the real provider works (that needs a live call with a valid key and quota).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callModel, ModelCallError, NotConfiguredError } from "@/lib/llm";

const KEY = "test-key-not-real";
const req = { system: "sys", user: "usr", schema: { type: "object" }, schemaName: "marking" };
const ok = (text: string, extraParts: object[] = []) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [...extraParts, { text }] } }], usageMetadata: { totalTokenCount: 10 } }), { status: 200 });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  process.env.GEMINI_API_KEY = KEY;
  delete process.env.GEMINI_MODEL;
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Gemini client", () => {
  it("refuses to run without a server-side key", async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(callModel(req)).rejects.toBeInstanceOf(NotConfiguredError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("only accepts Gemini model ids", async () => {
    process.env.GEMINI_MODEL = "some-other-vendor-model";
    await expect(callModel(req)).rejects.toBeInstanceOf(ModelCallError);
  });

  it("sends JSON mode, the schema, temperature 0 and low thinking; the key travels only in a header", async () => {
    fetchMock.mockResolvedValueOnce(ok('{"a":1}'));
    await callModel(req);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent");
    expect(url).not.toContain(KEY);
    expect(init.headers["x-goog-api-key"]).toBe(KEY);
    expect(init.body).not.toContain(KEY);
    const body = JSON.parse(init.body);
    expect(body.generationConfig).toMatchObject({ temperature: 0, responseMimeType: "application/json", responseJsonSchema: req.schema, thinkingConfig: { thinkingLevel: "low" } });
  });

  it("ignores thought parts and code fences when reading the reply", async () => {
    fetchMock.mockResolvedValueOnce(ok('```json\n{"points":[]}\n```', [{ text: "thinking...", thought: true }]));
    expect((await callModel(req)).data).toEqual({ points: [] });
  });

  it("hands back malformed text unparsed, so schema validation rejects it", async () => {
    fetchMock.mockResolvedValueOnce(ok("not json at all"));
    expect((await callModel(req)).data).toBe("not json at all");
  });

  it("on a used-up daily quota, tries the fallback model once, then stops (no waiting retries)", async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ error: { details: [{ retryDelay: "80000s" }] } }), { status: 429 }));
    await expect(callModel(req)).rejects.toThrow(/quota is used up/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain("gemini-3.5-flash-lite");
  });

  it("switches to the lighter fallback model when the main model is overloaded, and says which model answered", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 503 })).mockResolvedValueOnce(ok('{"ok":true}'));
    const res = await callModel(req);
    expect(res).toMatchObject({ data: { ok: true }, model: "gemini-3.5-flash-lite" });
    const fallbackBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(fallbackBody.generationConfig.thinkingConfig).toBeUndefined(); // lite models get no thinking config
  });

  it("can switch the fallback off with GEMINI_FALLBACK_MODEL=none", async () => {
    process.env.GEMINI_FALLBACK_MODEL = "none";
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 400 }));
    await expect(callModel(req)).rejects.toThrow(/HTTP 400/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    delete process.env.GEMINI_FALLBACK_MODEL;
  });

  it("does not retry or switch on a client error such as a bad request", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 400 }));
    await expect(callModel(req)).rejects.toThrow(/HTTP 400/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a server error on the fallback model and succeeds", async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(new Response("{}", { status: 503 })) // main model overloaded -> switch
      .mockResolvedValueOnce(new Response("{}", { status: 503 })) // fallback overloaded -> retry
      .mockResolvedValueOnce(ok('{"ok":true}'));
    const p = callModel(req);
    await vi.runAllTimersAsync();
    expect((await p).data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("gives up after a bounded number of tries on repeated network failures", async () => {
    vi.useFakeTimers();
    fetchMock.mockRejectedValue(new TypeError("network down"));
    const p = callModel(req).catch((e) => e);
    await vi.runAllTimersAsync();
    const err = await p;
    expect(err).toBeInstanceOf(ModelCallError);
    expect(err.message).toMatch(/busy or unreachable/);
    expect(fetchMock).toHaveBeenCalledTimes(5); // 1 on the main model, then 4 on the fallback
  });
});

describe("faculty export endpoint", () => {
  const env = process.env as Record<string, string | undefined>;
  const prev = env.NODE_ENV;
  afterEach(() => {
    env.NODE_ENV = prev;
    delete env.EXPORT_TOKEN;
  });

  it("is closed in production unless EXPORT_TOKEN is set and sent", async () => {
    const { GET } = await import("@/app/api/export/route");
    env.NODE_ENV = "production";
    expect((await GET(new Request("http://x/api/export"))).status).toBe(404);
    env.EXPORT_TOKEN = "secret-token";
    expect((await GET(new Request("http://x/api/export?token=wrong"))).status).toBe(404);
    expect((await GET(new Request("http://x/api/export", { headers: { "x-export-token": "secret-token" } }))).status).toBe(200);
  });
});
