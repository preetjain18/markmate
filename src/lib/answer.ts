/** Answer length limits, shared by the practice page (before sending) and the evaluation pipeline (server). */
export const MIN_ANSWER_CHARS = 20;
export const MAX_ANSWER_CHARS = 8000;

export const countWords = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

/** Returns a message explaining why the answer can't be evaluated yet, or null if it can. */
export function answerProblem(answer: string): string | null {
  const t = answer.trim();
  if (!t) return "Write your answer before evaluating it.";
  if (t.length < MIN_ANSWER_CHARS) return "Your answer is too short to evaluate. Write at least a sentence or two.";
  if (t.length > MAX_ANSWER_CHARS) return `Your answer is too long. Keep it under ${MAX_ANSWER_CHARS.toLocaleString("en-IN")} characters.`;
  return null;
}
