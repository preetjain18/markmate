/**
 * The only file that calls a model. Every call goes through OpenRouter and is
 * restricted to Google's own infrastructure. The key is read only from the environment.
 */
const BASE_URL = "https://openrouter.ai/api/v1";
export const DEFAULT_MODEL = "google/gemini-3.7-flash";

export class NotConfiguredError extends Error {
  constructor() {
    super("OPENROUTER_API_KEY is not set. Add it to .env (locally) or to the project's environment variables.");
  }
}
export class OutOfCreditsError extends Error {
  constructor() {
    super("OpenRouter says the account is out of credits (402). Add credits and try again.");
  }
}
export class ModelCallError extends Error {}

export type ModelRequest = { system: string; user: string; schema: object; schemaName: string };
export type ModelResponse = { data: unknown; model: string; usage?: unknown };
export type ModelCaller = (req: ModelRequest) => Promise<ModelResponse>;

export function getModelId(): string {
  const id = process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL;
  if (!id.startsWith("google/")) throw new ModelCallError("OPENROUTER_MODEL must be a Google model (an ID starting with google/).");
  return id;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(t);
}

export const callModel: ModelCaller = async ({ system, user, schema, schemaName }) => {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) throw new NotConfiguredError();
  const model = getModelId();

  const body = {
    model,
    temperature: 0,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_schema", json_schema: { name: schemaName, strict: true, schema } },
    provider: { only: ["google-vertex", "google-ai-studio"], allow_fallbacks: false },
  };

  let lastStatus = 0;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await sleep(800 * 2 ** (attempt - 1));
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      lastStatus = 0;
      continue;
    }
    lastStatus = res.status;
    if (res.status === 402) throw new OutOfCreditsError();
    if (res.status === 429 || res.status >= 500) continue;
    if (!res.ok) throw new ModelCallError(`The model call failed (HTTP ${res.status}).`);

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new ModelCallError("The model returned no text.");
    try {
      return { data: parseJson(content), model: json.model ?? model, usage: json.usage };
    } catch {
      // Not valid JSON: hand back the raw text so the zod check fails and the single retry runs.
      return { data: content, model: json.model ?? model, usage: json.usage };
    }
  }
  throw new ModelCallError(`The model is busy or unreachable (last status ${lastStatus || "network error"}). Try again.`);
};
