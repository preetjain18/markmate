/**
 * The only file that calls a model: Google Gemini through the Gemini API.
 * The key is read only from the environment (GEMINI_API_KEY) and is never logged.
 */
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
export const DEFAULT_MODEL = "gemini-3.7-flash";

export class NotConfiguredError extends Error {
  constructor() {
    super("GEMINI_API_KEY is not set. Add it to .env (locally) or to the project's environment variables.");
  }
}
export class ModelCallError extends Error {}

export type ModelRequest = { system: string; user: string; schema: object; schemaName: string };
export type ModelResponse = { data: unknown; model: string; usage?: unknown };
export type ModelCaller = (req: ModelRequest) => Promise<ModelResponse>;

export const aiConfigured = () => !!process.env.GEMINI_API_KEY?.trim();

export function getModelId(): string {
  const id = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  if (!id.startsWith("gemini")) throw new ModelCallError("GEMINI_MODEL must be a Gemini model id, for example gemini-3.7-flash.");
  return id;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Reads google.rpc.RetryInfo.retryDelay (e.g. "83978.2s") from a 429 body; 0 if absent. */
function retryDelaySeconds(body: unknown): number {
  const details = (body as { error?: { details?: { retryDelay?: string }[] } })?.error?.details ?? [];
  const d = details.find((x) => typeof x.retryDelay === "string")?.retryDelay;
  return d ? parseFloat(d) || 0 : 0;
}

function formatDelay(s: number): string {
  if (s >= 3600) return `${Math.round(s / 3600)} hours`;
  if (s >= 60) return `${Math.round(s / 60)} minutes`;
  return `${Math.round(s)} seconds`;
}

function parseJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(t);
}

export const callModel: ModelCaller = async ({ system, user, schema }) => {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new NotConfiguredError();
  const model = getModelId();

  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseJsonSchema: schema,
      // Low thinking keeps a marking call to a few seconds instead of ~30.
      thinkingConfig: { thinkingLevel: "low" },
    },
  };

  let lastStatus = 0;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await sleep(800 * 2 ** (attempt - 1));
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/models/${model}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(45_000),
      });
    } catch {
      lastStatus = 0;
      continue;
    }
    lastStatus = res.status;
    if (res.status === 429) {
      // A long retry delay means the quota (for example the free tier's daily limit) is used up: stop now.
      const delay = retryDelaySeconds(await res.json().catch(() => null));
      if (delay > 10) throw new ModelCallError(`Gemini quota is used up; it resets in about ${formatDelay(delay)}.`);
      continue;
    }
    if (res.status >= 500) continue;
    if (!res.ok) throw new ModelCallError(`The Gemini call failed (HTTP ${res.status}).`);

    const json = await res.json();
    const parts: { text?: string; thought?: boolean }[] = json?.candidates?.[0]?.content?.parts ?? [];
    const text = parts.filter((p) => !p.thought && typeof p.text === "string").map((p) => p.text).join("");
    if (!text) throw new ModelCallError("Gemini returned no text.");
    try {
      return { data: parseJson(text), model, usage: json.usageMetadata };
    } catch {
      // Not valid JSON: hand back the raw text so the zod check fails and the single retry runs.
      return { data: text, model, usage: json.usageMetadata };
    }
  }
  throw new ModelCallError(`Gemini is busy or unreachable (last status ${lastStatus || "network error"}).`);
};
