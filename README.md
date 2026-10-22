# MarkMate

Answer-writing practice for CA students. Pick your CA level, subject, chapter and question, write an
answer, see the Lost Marks Map, rewrite it in the Improvement Lab, compare attempts, and track progress.

**Evaluation coverage today:** 39 written-answer questions across all 16 papers of CA Foundation,
Intermediate and Final (10 for Final Audit, 1–2 for every other paper). Every marking scheme is a draft
(`"verified": false`, not ICAI text). Numerical papers have written theory questions only; numerical
problems aren't marked yet. Students can also paste their own question and model answer for any paper.

**Handwritten answers:** students can upload up to 4 photos of their answer sheet. Gemini reads the
handwriting; the student checks and corrects the text (unreadable words appear as `[illegible]` and must
be fixed) before it is marked. Photos are sent to Google Gemini and not stored by MarkMate. This needs the AI:
without `GEMINI_API_KEY` (or with no quota) the upload says so and the student can type instead.

**Question of the Day and streak:** one question per day (same for everyone, within the student's chosen
level), and a practice streak counted from the evaluations saved in the browser.

## Run it locally

Requires Node.js 20 or newer.

```bash
npm install
npm test
npm run dev
```

Open http://localhost:3000. Create `.env` from `.env.example` (never commit it):

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | For AI marking | Google Gemini API key. Read only on the server. Without it, the local rule-based marker is used. |
| `GEMINI_MODEL` | No | Defaults to `gemini-3.7-flash`. Must start with `gemini`. |
| `EXPORT_TOKEN` | No | Enables the faculty CSV export in production (see below). |

No variable uses the `NEXT_PUBLIC_` prefix, so none is sent to the browser.

## Pages

| Route | What it is |
|---|---|
| `/` | Landing page |
| `/practice` | Level → subject → chapter → topic → question, answer editor, Lost Marks Map, Improvement Lab, comparison. Accepts `?level=&subject=&chapter=&topic=&question=` links. |
| `/progress` | Your Progress dashboard |
| `/design` | Design-system reference (not linked from the site) |

## How marking works

- `src/lib/llm.ts` is the only file that calls a model: the Gemini API (`generativelanguage.googleapis.com`), temperature 0, JSON output against a schema, low thinking. Up to 4 tries on 429/5xx/network errors within a 28-second budget per call; a used-up daily quota stops at once.
- The model only proposes a status, marks and a quote per marking point. zod validates the reply; one retry if it's invalid.
- If no key is set or the AI fails, `src/lib/localmark.ts` (rule-based keyword matching) marks instead. Results always say which marker ran.
- `src/lib/scoring.ts` then decides the numbers: every quote must appear word for word in the answer (otherwise the point is held for review with 0 marks), marks are clamped to each point's allocation in half-mark steps, duplicates are dropped, and the total is capped.
- Questions without a marking scheme are never scored (the API returns 422).
- Comparisons (`src/lib/compare.ts`) refuse attempts with a different question, rubric version or mark allocation.

## Data and persistence

- `data/catalog.json` — levels and papers (ICAI New Scheme 2023), Final Audit chapters grouped by SA series (MarkMate's grouping, not ICAI's chapter order).
- `data/rubrics/*.json` — the 10 questions with their draft marking schemes. `data/questions/*.json` may hold practice-only questions without a scheme.
- **Progress** is stored only in the student's browser (`localStorage`, key `markmate-history-v1`): one compact record per evaluation (no answer text). It is per device and per browser; there are no accounts.
- **Drafts** are stored per question in the browser.
- **Faculty logs**: each evaluation (including answer text) is appended to `data/logs/*.jsonl` on the server. On Vercel this folder is temporary and is lost on redeploys.

## Faculty validation

Download CSVs from `/api/export?type=points` or `/api/export?type=attempts`. Locally this is open; in
production it returns 404 unless `EXPORT_TOKEN` is set and sent as `x-export-token` (or `?token=`).
Faculty fill in `facultyMarks`, then run `npm run agreement -- markmate-points.csv`.

## Deploying on Vercel

Push to `main`; Vercel builds automatically. Add `GEMINI_API_KEY` (and optionally `EXPORT_TOKEN`) under
Project Settings → Environment Variables, then redeploy. Without the key the live site uses the rule-based marker.

## Honesty

- Marks are practice estimates, not ICAI marks.
- The marking schemes are drafts until a CA verifies them; nothing is marked verified.
- Report accuracy only after a CA has marked a sample and `npm run agreement` has measured it.

See `DEMO.md` for the hackathon demo checklist.
