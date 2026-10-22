# MarkMate

Answer checker for CA Final Audit. Pick a question, write an answer, see the Lost Marks Map,
rewrite, and compare Attempt 1 with Attempt 2. Everything runs inside this one Next.js app.
Marking uses Google Gemini when a key is set, and a local rule-based marker otherwise.

## Run it

Install Node.js 20 or newer. Put your Gemini key in `.env` (see `.env.example`):

```
GEMINI_API_KEY=your-key
GEMINI_MODEL=gemini-3.7-flash
```

Then:

```bash
npm install
npm test
npm run dev
```

Open http://localhost:3000.

## How marking works

- `src/lib/llm.ts` is the only file that calls a model (Gemini API, temperature 0, JSON output). It retries 429 and 5xx errors up to 3 times. The model only proposes a status, marks and a quote for each marking point; zod validates the reply and it retries once if invalid.
- If no key is set, or the AI fails, `src/lib/localmark.ts` marks instead: it looks for the rubric's keywords and key terms, quotes the best matching sentence, and proposes marks. The result says which marker ran.
- `src/lib/scoring.ts` then checks every quote against the answer, clamps marks to each point's allocation in half-mark steps, drops duplicates, sums the total and caps it.
- Missing SA references, missing keywords and the Attempt 1 vs 2 comparison are computed in code.
- Limits of the local marker: it matches words and stems, so a correct answer in very different wording can lose marks. Treat all results as practice feedback only.

## Deploying on Vercel

Add `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) under Project Settings → Environment Variables, then redeploy.

## Faculty validation (inside the app)

Each check is saved to `data/logs/attempts.jsonl` and `data/logs/points.jsonl`.
Download CSVs at `/api/export?type=points` and `/api/export?type=attempts`.
Faculty fill in `facultyMarks`, then run `npm run agreement -- markmate-points.csv`.
On Vercel the project folder is read-only, so logs there are temporary.

## Honesty

- Marks are practice marks, not ICAI marks.
- The 10 starter marking schemes in `data/rubrics/` are drafts, not ICAI text, and all say `"verified": false`.
- Report accuracy only after a CA has marked a sample and `npm run agreement` has measured it.
