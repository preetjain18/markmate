# MarkMate hackathon demo checklist

## Before you present

- [ ] The Gemini key has quota left. The free tier allows about **20 requests a day**; a full demo
      run uses about 4 (two evaluations, and possibly a retry). Enable billing in Google AI Studio for headroom.
- [ ] `GEMINI_API_KEY` is set in Vercel (Project Settings → Environment Variables) and the site was
      redeployed afterwards. Check: evaluate once on the live site; the results should say
      "AI-generated practice estimate", not "Rule-based".
- [ ] Open the live site on the phone you'll use.
- [ ] Use a fresh browser profile (or Clear history on /progress) so the dashboard starts clean.

## The path (about 5 minutes)

1. **Landing** (`/`): the problem in one line; point at the sample Lost Marks Map, labelled as an example.
2. **Start Practising** → choose **CA Final** → show the subject grid (Audit has questions; other papers
   honestly say "Coming soon") → **Advanced Auditing** → chapter **Audit evidence** → topic **SA 570**.
3. **SA 570 · Going Concern** (5 marks; the richest scheme). Paste a deliberately incomplete answer:

   > Management prepares the financial statements on the going concern basis. The company has heavy
   > losses and the auditor should check it. The auditor then writes about it in the report.

4. **Evaluate My Answer.** On the **Lost Marks Map** show:
   - the score and outcome counts, and the label "practice estimate · not an ICAI mark";
   - a covered point with **your exact words**, quote verified;
   - a missed point saying "No supporting evidence found in your answer";
   - **Your Top Improvement Priorities** and the clearly labelled **Suggested improvement**;
   - "Your answer, annotated".
5. **Improve My Answer** → the **Improvement Lab** (What to Focus On beside the editor; Attempt 1 locked).
   Add the missing points:

   > Events such as net current liabilities and loan defaults may cast significant doubt. The auditor
   > evaluates management's plans and cash flow forecasts. If a material uncertainty exists and is
   > adequately disclosed, the auditor gives an unmodified opinion with a separate section titled
   > Material Uncertainty Related to Going Concern.

6. **Evaluate Improved Answer** → **Attempt 1 vs Attempt 2**: the mark change, **What Improved**,
   and open a row to show both attempts' quotes side by side.
7. **Progress** (header): overview, What to Practise Next, chapter insights. Click a recommendation to
   show it opens the right chapter or question.

## If the AI fails during the demo

- MarkMate falls back automatically to its **rule-based marker** and says so on screen
  ("The AI was not available…", "Rule-based practice estimate"). It is a real marker, not demo data,
  but it is cruder: say so, and carry on with the same path.
- If the network is down entirely, the page shows "Couldn't reach MarkMate" with **Try again**;
  the answer is never lost.

## What is ready

| Feature | Status |
|---|---|
| Landing page, navigation, mobile menu | Working |
| Level → subject → chapter → topic → question browsing | Working |
| Answer editor, validation, loading/error/retry | Working |
| Lost Marks Map with verified evidence | Working |
| Improvement Lab and attempt comparison | Working |
| Progress dashboard (this browser only) | Working |
| Gemini evaluation | Working when the key has quota (verified locally earlier; quota currently used up) |
| Your own question (draft scheme from a model answer) | Working; scheme is unverified |
| Subjects other than CA Final Audit | No questions yet ("Coming soon") |
| Verified marking schemes | Not ready: all 10 are drafts pending CA review |
| Accounts, cross-device progress | Not built |
