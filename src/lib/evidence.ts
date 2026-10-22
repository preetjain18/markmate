/** Lower-case and collapse all whitespace so quotes can be matched word for word. */
export function normalise(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** True only if the quote appears in the answer, word for word, after normalisation. */
export function quoteInAnswer(quote: string, answer: string): boolean {
  const q = normalise(quote);
  if (q.length < 3) return false;
  return normalise(answer).includes(q);
}
