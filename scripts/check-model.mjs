// Checks that the configured model exists on OpenRouter and prints its pricing.
// Never prints the API key. Run: npm run check-model
const model = (process.env.OPENROUTER_MODEL || "google/gemini-3.7-flash").trim();

if (!model.startsWith("google/")) {
  console.error("OPENROUTER_MODEL must start with google/");
  process.exit(1);
}

const res = await fetch("https://openrouter.ai/api/v1/models");
if (!res.ok) {
  console.error(`Could not list models (HTTP ${res.status}).`);
  process.exit(1);
}
const { data } = await res.json();
const found = data.find((m) => m.id === model);

if (!found) {
  const close = data.filter((m) => m.id.startsWith("google/gemini")).map((m) => m.id);
  console.error(`Model ${model} was not found. Available Google Gemini models:\n  ${close.join("\n  ")}`);
  process.exit(1);
}

const perM = (v) => `$${(Number(v) * 1_000_000).toFixed(3)} per million tokens`;
console.log(`Model:  ${found.id}`);
console.log(`Input:  ${perM(found.pricing.prompt)}`);
console.log(`Output: ${perM(found.pricing.completion)}`);
console.log(`Context: ${found.context_length} tokens`);
console.log(`OPENROUTER_API_KEY is ${process.env.OPENROUTER_API_KEY ? "set" : "NOT set"}.`);
