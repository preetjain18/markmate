"use client";

import { useEffect, useState } from "react";
import { STATUS_LABEL, type AttemptResult, type Rubric } from "@/lib/schema";

type QuestionItem = { id: string; sa: string; topic: string; question: string; maxMarks: number; verified: boolean };

const CUSTOM = "__custom__";

function sessionId(): string {
  try {
    let id = localStorage.getItem("markmate-session");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("markmate-session", id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

const badge: Record<string, string> = {
  correct_complete: "bg-emerald-100 text-emerald-800",
  correct_incomplete: "bg-amber-100 text-amber-800",
  incorrect: "bg-red-100 text-red-800",
  not_addressed: "bg-slate-200 text-slate-700",
  uncertain: "bg-purple-100 text-purple-800",
};

export default function Checker() {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [selected, setSelected] = useState("");
  const [answer, setAnswer] = useState("");
  const [rewrite, setRewrite] = useState("");
  const [first, setFirst] = useState<AttemptResult | null>(null);
  const [second, setSecond] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // custom question
  const [cQuestion, setCQuestion] = useState("");
  const [cModel, setCModel] = useState("");
  const [cMarks, setCMarks] = useState(5);
  const [draft, setDraft] = useState<Rubric | null>(null);

  useEffect(() => {
    fetch("/api/questions")
      .then((r) => r.json())
      .then((d) => {
        setQuestions(d.questions);
        if (d.questions[0]) setSelected(d.questions[0].id);
      })
      .catch(() => setError("Could not load the questions."));
  }, []);

  const isCustom = selected === CUSTOM;
  const current = questions.find((q) => q.id === selected);
  const draftSum = draft ? draft.points.reduce((s, p) => s + p.marks, 0) : 0;
  const draftOk = draft ? Math.abs(draftSum - draft.maxMarks) < 1e-9 : false;
  const canMark = isCustom ? draftOk : !!current;

  function reset() {
    setFirst(null);
    setSecond(null);
    setRewrite("");
    setError("");
  }

  async function post(url: string, body: unknown) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
    return data;
  }

  async function makeDraft() {
    setLoading(true);
    setError("");
    try {
      const d = await post("/api/rubric", { question: cQuestion, modelAnswer: cModel, maxMarks: cMarks });
      setDraft(d.rubric);
      setSelected(CUSTOM);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function mark(attemptNo: 1 | 2) {
    setLoading(true);
    setError("");
    try {
      const text = attemptNo === 1 ? answer : rewrite;
      const body: Record<string, unknown> = { answer: text, sessionId: sessionId(), attemptNo };
      if (isCustom) body.rubric = draft;
      else body.questionId = selected;
      if (attemptNo === 2 && first) body.previous = first;
      const result: AttemptResult = await post("/api/evaluate", body);
      if (attemptNo === 1) {
        setFirst(result);
        setSecond(null);
        setRewrite(text);
      } else setSecond(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function updatePoint(i: number, patch: Partial<Rubric["points"][number]>) {
    if (!draft) return;
    setDraft({ ...draft, points: draft.points.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold">MarkMate</h1>
      <p className="mt-1 text-slate-600">
        Write a CA Final Audit answer. See exactly which marks you lost, rewrite, and watch the marks go up.
      </p>
      <p className="mt-2 rounded bg-amber-50 px-3 py-2 text-sm text-amber-900">
        AI-estimated practice marks, not ICAI marks. Every mark must be backed by a quote from your answer. Marking schemes are unverified drafts, not ICAI text.
      </p>

      <section className="mt-6 space-y-3 rounded-lg border bg-white p-4">
        <label className="block text-sm font-medium">Question</label>
        <select
          className="w-full rounded border p-2"
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            reset();
          }}
        >
          {questions.map((q) => (
            <option key={q.id} value={q.id}>
              {q.sa} – {q.topic} ({q.maxMarks} marks)
            </option>
          ))}
          <option value={CUSTOM}>My own question…</option>
        </select>

        {current && (
          <p className="text-slate-800">
            {current.question}{" "}
            <span className="text-xs text-slate-500">[{current.verified ? "Verified by a CA" : "Unverified marking scheme"}]</span>
          </p>
        )}

        {isCustom && (
          <div className="space-y-2">
            <textarea className="w-full rounded border p-2" rows={3} placeholder="Paste the question" value={cQuestion} onChange={(e) => setCQuestion(e.target.value)} />
            <textarea className="w-full rounded border p-2" rows={6} placeholder="Paste the model answer (for example from the ICAI Suggested Answer)" value={cModel} onChange={(e) => setCModel(e.target.value)} />
            <label className="text-sm">
              Total marks{" "}
              <input type="number" min={1} max={20} step={0.5} className="w-20 rounded border p-1" value={cMarks} onChange={(e) => setCMarks(Number(e.target.value))} />
            </label>{" "}
            <button className="rounded bg-slate-800 px-3 py-1.5 text-white disabled:opacity-50" disabled={loading || cQuestion.length < 10 || cModel.length < 30} onClick={makeDraft}>
              {loading && !draft ? "Drafting…" : "Draft marking points"}
            </button>
            {draft && (
              <div className="space-y-2 rounded border bg-slate-50 p-3">
                <p className="text-sm font-medium">Marking points (unverified). Edit the marks until they add up to {draft.maxMarks}.</p>
                {draft.points.map((p, i) => (
                  <div key={p.id} className="flex items-start gap-2">
                    <input type="number" step={0.5} min={0.5} className="w-16 rounded border p-1" value={p.marks} onChange={(e) => updatePoint(i, { marks: Number(e.target.value) })} />
                    <div className="text-sm">
                      <div className="font-medium">{p.label}</div>
                      <div className="text-slate-600">{p.description}</div>
                    </div>
                  </div>
                ))}
                <p className={`text-sm ${draftOk ? "text-emerald-700" : "text-red-700"}`}>
                  Total: {draftSum} / {draft.maxMarks}
                </p>
              </div>
            )}
          </div>
        )}

        <label className="block text-sm font-medium">Your answer</label>
        <textarea className="w-full rounded border p-2" rows={10} placeholder="Type your answer here…" value={answer} onChange={(e) => setAnswer(e.target.value)} />
        <button className="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50" disabled={loading || !canMark || answer.trim().length < 20} onClick={() => mark(1)}>
          {loading && !first ? "Marking…" : "Check my answer"}
        </button>
      </section>

      {error && <p className="mt-4 rounded bg-red-50 p-3 text-red-800">{error}</p>}

      {first && <Result title="Attempt 1: Lost Marks Map" r={first} />}

      {first && (
        <section className="mt-6 space-y-3 rounded-lg border bg-white p-4">
          <h2 className="text-xl font-semibold">Improvement Lab</h2>
          <p className="text-sm text-slate-600">Rewrite your answer using the “To recover” tips, then mark it again with the same marking scheme.</p>
          <textarea className="w-full rounded border p-2" rows={10} value={rewrite} onChange={(e) => setRewrite(e.target.value)} />
          <button className="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50" disabled={loading || rewrite.trim().length < 20} onClick={() => mark(2)}>
            {loading && !!first && !second ? "Marking…" : "Mark my rewrite"}
          </button>
        </section>
      )}

      {second && (
        <>
          <Result title="Attempt 2: Lost Marks Map" r={second} />
          {second.comparison && (
            <section className="mt-6 rounded-lg border bg-white p-4">
              <h2 className="text-xl font-semibold">
                Attempt 1 vs Attempt 2: {second.comparison.marksBefore} → {second.comparison.marksAfter} / {second.maxMarks}
              </h2>
              <p className="mt-2 text-slate-700">{second.comparison.summary}</p>
              <ChangeList title="Recovered" items={second.comparison.recovered} />
              <ChangeList title="Improved" items={second.comparison.improved} />
              <ChangeList title="Lost" items={second.comparison.lost} />
              <ChangeList title="Still missing" items={second.comparison.stillMissing} />
            </section>
          )}
        </>
      )}
    </main>
  );
}

function ChangeList({ title, items }: { title: string; items: { pointId: string; label: string; from: number; to: number; allocated: number }[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-3">
      <h3 className="font-medium">{title}</h3>
      <ul className="list-disc pl-5 text-sm text-slate-700">
        {items.map((c) => (
          <li key={c.pointId}>
            {c.label}: {c.from} → {c.to} / {c.allocated}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Result({ title, r }: { title: string; r: AttemptResult }) {
  return (
    <section className="mt-6 rounded-lg border bg-white p-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-1 text-3xl font-bold">
        {r.estimatedMarks} <span className="text-lg font-normal text-slate-500">/ {r.maxMarks}</span>
      </p>
      <p className="text-xs text-slate-500">
        {r.aiUsed ? "AI-estimated" : "Rule-based"} practice marks, not ICAI marks · {r.verified ? "Verified marking scheme" : "Unverified marking scheme"} ·{" "}
        {r.aiUsed ? `AI: ${r.model}` : r.model}
      </p>
      {r.aiError && (
        <p className="mt-2 rounded bg-slate-100 p-2 text-sm text-slate-700">
          The AI was not available ({r.aiError.replace(/\.$/, "")}), so this was marked by the local rule-based marker instead.
        </p>
      )}
      {r.needsReview && (
        <p className="mt-2 rounded bg-purple-50 p-2 text-sm text-purple-900">
          Up to {r.pendingReviewMarks} marks are pending review because they could not be backed with a quote from your answer.
        </p>
      )}

      <div className="mt-4 space-y-3">
        {r.points.map((p) => (
          <div key={p.pointId} className="rounded border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{p.label}</span>
              <span className="whitespace-nowrap text-sm">
                {p.aiMarks} / {p.allocated}
              </span>
            </div>
            <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs ${badge[p.aiStatus]}`}>{STATUS_LABEL[p.aiStatus]}</span>
            {p.evidenceVerified && p.evidenceQuote && <p className="mt-2 border-l-4 border-slate-300 pl-2 text-sm italic">“{p.evidenceQuote}”</p>}
            {p.reason && <p className="mt-2 text-sm">{p.reason}</p>}
            {p.reviewReason && <p className="mt-1 text-sm text-purple-800">{p.reviewReason}</p>}
            {p.toRecover && (
              <p className="mt-2 text-sm text-blue-800">
                <strong>To recover:</strong> {p.toRecover}
              </p>
            )}
          </div>
        ))}
      </div>

      {r.missingReferences.length > 0 && (
        <p className="mt-4 text-sm">
          <strong>Missing SA references:</strong> {r.missingReferences.join(", ")}
        </p>
      )}
      {r.missingKeywords.length > 0 && (
        <p className="mt-2 text-sm">
          <strong>Missing keywords:</strong> {r.missingKeywords.join(", ")}
        </p>
      )}
      {r.presentationTips.length > 0 && (
        <div className="mt-2 text-sm">
          <strong>Presentation tips</strong>
          <ul className="list-disc pl-5">
            {r.presentationTips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
