# MarkMate

AI answer checker for CA Final Audit. Pick a question, write an answer, see the Lost Marks Map,
rewrite, and compare Attempt 1 with Attempt 2. Everything runs inside this one Next.js app.

## Setup

1. Install Node.js 20 or newer from https://nodejs.org
2. Put your OpenRouter key in `.env` (see `.env.example`):

   ```
   OPENROUTER_API_KEY=your-key
   ```

3. Install, check the model, test, run:

   ```bash
   npm install
   npm run check-model
   npm test
   npm run dev
   ```

Open http://localhost:3000.

## How the AI is used

- Only Google models through OpenRouter (`google/gemini-3.7-flash` by default; change with `OPENROUTER_MODEL`, must start with `google/`).
- Every request limits routing to `google-vertex` and `google-ai-studio` with no fallbacks.
- `src/lib/llm.ts` is the only file that calls a model. It retries 429 and 5xx errors up to 3 times and stops on 402 (out of credits).
- The model only proposes a status and marks per marking point. Code verifies quotes, clamps marks, sums totals and builds the comparison.

## Faculty validation (no external service)

Each check is saved inside the app to `data/logs/attempts.jsonl` and `data/logs/points.jsonl`
(on Vercel these go to a temporary folder and are not permanent).
Download CSVs at `/api/export?type=points` and `/api/export?type=attempts`.
Faculty fill in `facultyMarks`, then run `npm run agreement -- markmate-points.csv`.

## Honesty

- Marks are AI-estimated practice marks, not ICAI marks.
- The 10 starter marking schemes in `data/rubrics/` are drafts, not ICAI text, and all say `"verified": false`.
- Report accuracy only after a CA has marked a sample and `npm run agreement` has measured it.
