"use client";

import { useEffect, useRef, useState } from "react";
import type { AttemptResult, Rubric } from "@/lib/schema";
import { cn, fmt } from "@/lib/ui";
import { Button, Card, Icon, Pill } from "../ui";
import Comparison from "./Comparison";
import LostMarksMap from "./LostMarksMap";

export type QuestionItem = { id: string; sa: string; topic: string; question: string; maxMarks: number; verified: boolean };

const CUSTOM = "__custom__";
const MAX_CHARS = 8000;

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

const draftKey = (id: string) => `markmate-draft:${id}`;
const loadDraft = (id: string) => {
  try {
    return localStorage.getItem(draftKey(id)) ?? "";
  } catch {
    return "";
  }
};
const saveDraft = (id: string, text: string) => {
  try {
    localStorage.setItem(draftKey(id), text);
  } catch {}
};

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data as T;
}

const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

export default function PracticeApp({ questions }: { questions: QuestionItem[] }) {
  const [selected, setSelected] = useState(questions[0]?.id ?? CUSTOM);
  const [answer, setAnswer] = useState("");
  const [rewrite, setRewrite] = useState("");
  const [first, setFirst] = useState<AttemptResult | null>(null);
  const [firstAnswer, setFirstAnswer] = useState("");
  const [second, setSecond] = useState<AttemptResult | null>(null);
  const [busy, setBusy] = useState<null | "mark1" | "mark2" | "draft">(null);
  const [error, setError] = useState("");

  const [cQuestion, setCQuestion] = useState("");
  const [cModel, setCModel] = useState("");
  const [cMarks, setCMarks] = useState(5);
  const [draft, setDraft] = useState<Rubric | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const labRef = useRef<HTMLDivElement>(null);
  const cmpRef = useRef<HTMLDivElement>(null);

  const isCustom = selected === CUSTOM;
  const current = questions.find((q) => q.id === selected);
  const draftSum = draft ? draft.points.reduce((s, p) => s + p.marks, 0) : 0;
  const draftOk = !!draft && Math.abs(draftSum - draft.maxMarks) < 1e-9;
  const canMark = (isCustom ? draftOk : !!current) && answer.trim().length >= 20 && answer.length <= MAX_CHARS;

  // Restore the saved draft when the question changes.
  useEffect(() => {
    setAnswer(loadDraft(selected));
  }, [selected]);
  useEffect(() => {
    saveDraft(selected, answer);
  }, [selected, answer]);

  const scrollTo = (r: React.RefObject<HTMLDivElement | null>) =>
    setTimeout(() => r.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);

  function pick(id: string) {
    if (id === selected) return;
    setSelected(id);
    setFirst(null);
    setSecond(null);
    setRewrite("");
    setError("");
  }

  async function makeDraft() {
    setBusy("draft");
    setError("");
    try {
      const d = await post<{ rubric: Rubric }>("/api/rubric", { question: cQuestion, modelAnswer: cModel, maxMarks: cMarks });
      setDraft(d.rubric);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function mark(attemptNo: 1 | 2) {
    setBusy(attemptNo === 1 ? "mark1" : "mark2");
    setError("");
    const text = attemptNo === 1 ? answer : rewrite;
    try {
      const body: Record<string, unknown> = { answer: text, sessionId: sessionId(), attemptNo };
      if (isCustom) body.rubric = draft;
      else body.questionId = selected;
      if (attemptNo === 2 && first) body.previous = first;
      const result = await post<AttemptResult>("/api/evaluate", body);
      if (attemptNo === 1) {
        setFirst(result);
        setFirstAnswer(text);
        setSecond(null);
        setRewrite(text);
        scrollTo(mapRef);
      } else {
        setSecond(result);
        scrollTo(cmpRef);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const step = second ? 4 : first ? (rewrite !== firstAnswer ? 3 : 2) : answer.trim() ? 1 : 0;
  const toRecover = first?.points.filter((p) => p.aiMarks < p.allocated) ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
      <Stepper step={step} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
        {/* Question list */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Choose a question</p>
          <label className="sr-only" htmlFor="q-mobile">
            Question
          </label>
          <select id="q-mobile" className="w-full rounded-xl bg-white p-3 text-sm ring-1 ring-slate-200 lg:hidden" value={selected} onChange={(e) => pick(e.target.value)}>
            {questions.map((q) => (
              <option key={q.id} value={q.id}>
                {q.sa} · {q.topic}
              </option>
            ))}
            <option value={CUSTOM}>Your own question</option>
          </select>
          <nav className="hidden max-h-[calc(100vh-9rem)] space-y-1 overflow-y-auto pr-1 lg:block">
            {questions.map((q) => (
              <button
                key={q.id}
                onClick={() => pick(q.id)}
                aria-label={`${q.sa}: ${q.topic}`}
                aria-current={selected === q.id ? "true" : undefined}
                className={cn(
                  "group flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition",
                  selected === q.id ? "bg-white shadow-soft ring-1 ring-slate-200" : "hover:bg-white/70",
                )}
              >
                <span className={cn("mt-0.5 rounded-md px-1.5 py-0.5 font-mono text-[11px]", selected === q.id ? "bg-ink text-white" : "bg-slate-100 text-slate-500")}>
                  {q.sa.replace("SA ", "")}
                </span>
                <span className={cn("text-sm leading-snug", selected === q.id ? "font-medium text-ink" : "text-slate-600 group-hover:text-ink")}>{q.topic}</span>
              </button>
            ))}
            <button
              onClick={() => pick(CUSTOM)}
              className={cn(
                "mt-2 flex w-full items-center gap-3 rounded-xl border border-dashed px-3 py-2.5 text-left text-sm transition",
                isCustom ? "border-brand-300 bg-brand-50 font-medium text-brand-800" : "border-slate-300 text-slate-600 hover:border-slate-400 hover:text-ink",
              )}
            >
              <Icon name="edit" /> Your own question
            </button>
          </nav>
        </aside>

        <div className="min-w-0 space-y-6">
          {/* Question */}
          {isCustom ? (
            <CustomBuilder
              q={cQuestion}
              setQ={setCQuestion}
              model={cModel}
              setModel={setCModel}
              marks={cMarks}
              setMarks={setCMarks}
              draft={draft}
              setDraft={setDraft}
              busy={busy === "draft"}
              onDraft={makeDraft}
              sum={draftSum}
              ok={draftOk}
            />
          ) : (
            current && (
              <Card className="p-6 sm:p-7">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill className="bg-ink text-white ring-ink">{current.sa}</Pill>
                  <Pill className="bg-slate-50 text-slate-600 ring-slate-200">{current.maxMarks} marks</Pill>
                  <Pill className={current.verified ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-amber-50 text-amber-700 ring-amber-600/20"}>
                    {current.verified ? "Verified by a CA" : "Unverified marking scheme"}
                  </Pill>
                </div>
                <h1 className="mt-4 text-sm font-medium text-slate-500">{current.topic}</h1>
                <p className="mt-1 text-lg leading-relaxed text-ink sm:text-xl">{current.question}</p>
              </Card>
            )
          )}

          {/* Answer */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <p className="text-sm font-medium">Your answer</p>
              <p className={cn("text-xs tabular-nums", answer.length > MAX_CHARS ? "text-rose-600" : "text-slate-400")}>
                {words(answer)} words · saved on this device
              </p>
            </div>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={12}
              placeholder="Write your answer the way you would in the exam. Use paragraphs or numbered points, and cite the relevant SA."
              className="block w-full resize-y bg-white px-5 py-4 text-[15px] leading-7 text-ink outline-none placeholder:text-slate-400"
            />
            <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                {isCustom && !draftOk ? "Draft the marking points and make the marks add up first." : "Your answer is only used to mark it and to check marking quality."}
              </p>
              <Button onClick={() => mark(1)} disabled={!canMark || !!busy}>
                {busy === "mark1" ? "Checking…" : first ? "Check again as Attempt 1" : "Check my answer"} <Icon name="arrow" />
              </Button>
            </div>
          </Card>

          {error && (
            <p className="flex gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
              <Icon name="alert" className="mt-0.5" /> {error}
            </p>
          )}

          {busy === "mark1" && <MarkingProgress />}

          <div ref={mapRef} className="scroll-mt-24">
            {first && busy !== "mark1" && <LostMarksMap result={first} answer={firstAnswer} title="Attempt 1 · Lost Marks Map" />}
          </div>

          {/* Improvement Lab */}
          {first && busy !== "mark1" && (
            <div ref={labRef} className="scroll-mt-24">
              <Card className="animate-fade-up overflow-hidden">
                <div className="border-b border-slate-100 p-5 sm:p-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">Improvement Lab</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">Rewrite and win the marks back</h2>
                  <p className="mt-1 text-sm text-slate-600">Your rewrite is re-marked with exactly the same marking scheme, so the comparison is fair.</p>
                </div>
                <div className="grid gap-0 lg:grid-cols-[1fr_1.3fr]">
                  <div className="border-b border-slate-100 p-5 lg:border-b-0 lg:border-r sm:p-7">
                    <p className="text-sm font-medium">{toRecover.length ? `${toRecover.length} point${toRecover.length > 1 ? "s" : ""} to fix` : "Nothing to fix"}</p>
                    <ul className="mt-3 space-y-3">
                      {toRecover.map((p) => (
                        <li key={p.pointId} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium leading-snug">{p.label}</p>
                            <span className="shrink-0 font-mono text-xs text-rose-600">−{fmt(p.allocated - p.aiMarks)}</span>
                          </div>
                          {p.toRecover && <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{p.toRecover}</p>}
                        </li>
                      ))}
                      {!toRecover.length && <li className="text-sm text-slate-500">You secured every point. Try another question.</li>}
                    </ul>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between px-5 pt-4 sm:px-7">
                      <p className="text-sm font-medium">Attempt 2</p>
                      <p className="text-xs tabular-nums text-slate-400">
                        {words(rewrite)} words ({words(rewrite) - words(firstAnswer) >= 0 ? "+" : ""}
                        {words(rewrite) - words(firstAnswer)})
                      </p>
                    </div>
                    <textarea
                      value={rewrite}
                      onChange={(e) => setRewrite(e.target.value)}
                      rows={14}
                      className="mx-5 mt-3 block flex-1 resize-y rounded-xl bg-slate-50/60 p-4 text-[15px] leading-7 outline-none ring-1 ring-slate-200 transition focus:bg-white focus:ring-brand-300 sm:mx-7"
                    />
                    <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-7">
                      <p className="text-xs text-slate-500">Extra length alone earns nothing.</p>
                      <Button onClick={() => mark(2)} disabled={!!busy || rewrite.trim().length < 20 || rewrite.trim() === firstAnswer.trim()}>
                        {busy === "mark2" ? "Re-marking…" : "Re-mark my rewrite"} <Icon name="arrow" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {busy === "mark2" && <MarkingProgress />}

          <div ref={cmpRef} className="scroll-mt-24 space-y-6">
            {first && second && busy !== "mark2" && (
              <>
                <Comparison first={first} second={second} />
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-slate-600 hover:text-ink">
                    <Icon name="arrow" className="transition group-open:rotate-90" /> See the full Lost Marks Map for Attempt 2
                  </summary>
                  <div className="mt-4">
                    <LostMarksMap result={second} answer={rewrite} title="Attempt 2 · Lost Marks Map" />
                  </div>
                </details>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const STEPS = ["Question", "Answer", "Lost Marks Map", "Improvement Lab", "Compare"];

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto pb-1 text-sm">
      {STEPS.map((s, i) => (
        <li key={s} className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              "grid size-6 place-items-center rounded-full text-xs font-semibold transition",
              i < step ? "bg-emerald-500 text-white" : i === step ? "bg-ink text-white" : "bg-white text-slate-400 ring-1 ring-slate-200",
            )}
          >
            {i < step ? <Icon name="check" className="size-3.5" /> : i + 1}
          </span>
          <span className={cn(i === step ? "font-medium text-ink" : "text-slate-500", i !== step && "hidden sm:inline")}>{s}</span>
          {i < STEPS.length - 1 && <span className="h-px w-6 bg-slate-200 sm:w-10" />}
        </li>
      ))}
    </ol>
  );
}

function MarkingProgress() {
  const msgs = ["Reading your answer", "Checking each marking point", "Verifying quotes word for word", "Adding up the marks"];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(x + 1, msgs.length - 1)), 1400);
    return () => clearInterval(t);
  }, [msgs.length]);
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3">
        <span className="relative flex size-3">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-400 opacity-60" />
          <span className="relative inline-flex size-3 rounded-full bg-brand-500" />
        </span>
        <p className="font-medium">{msgs[i]}…</p>
      </div>
      <div className="mt-5 space-y-3">
        {[0, 1, 2].map((k) => (
          <div key={k} className="animate-pulse-soft h-16 rounded-xl bg-slate-100" style={{ animationDelay: `${k * 150}ms` }} />
        ))}
      </div>
    </Card>
  );
}

function CustomBuilder(props: {
  q: string;
  setQ: (v: string) => void;
  model: string;
  setModel: (v: string) => void;
  marks: number;
  setMarks: (v: number) => void;
  draft: Rubric | null;
  setDraft: (r: Rubric) => void;
  busy: boolean;
  onDraft: () => void;
  sum: number;
  ok: boolean;
}) {
  const { draft } = props;
  const field = "w-full rounded-xl bg-slate-50/60 p-3.5 text-[15px] leading-relaxed outline-none ring-1 ring-slate-200 transition focus:bg-white focus:ring-brand-300";
  return (
    <Card className="p-6 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">Your own question</p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight">Paste a question and its model answer</h1>
      <p className="mt-1 text-sm text-slate-600">MarkMate drafts marking points from the model answer. You check the marks before your answer is marked.</p>
      <div className="mt-5 space-y-3">
        <textarea className={field} rows={3} placeholder="The question" value={props.q} onChange={(e) => props.setQ(e.target.value)} />
        <textarea className={field} rows={7} placeholder="The model answer, for example from the ICAI Suggested Answer" value={props.model} onChange={(e) => props.setModel(e.target.value)} />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            Total marks
            <input
              type="number"
              min={1}
              max={20}
              step={0.5}
              className="w-20 rounded-lg bg-white p-2 ring-1 ring-slate-200"
              value={props.marks}
              onChange={(e) => props.setMarks(Number(e.target.value))}
            />
          </label>
          <Button variant="secondary" onClick={props.onDraft} disabled={props.busy || props.q.trim().length < 10 || props.model.trim().length < 30}>
            <Icon name="spark" /> {props.busy ? "Drafting…" : draft ? "Draft again" : "Draft marking points"}
          </Button>
        </div>
      </div>

      {draft && (
        <div className="mt-6 animate-fade-up rounded-2xl bg-slate-50/70 p-4 ring-1 ring-slate-200/70 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Marking points</p>
            <Pill className="bg-amber-50 text-amber-700 ring-amber-600/20">Unverified</Pill>
          </div>
          <ul className="mt-3 space-y-2">
            {draft.points.map((p, i) => (
              <li key={p.id} className="flex items-start gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200/70">
                <input
                  type="number"
                  step={0.5}
                  min={0.5}
                  aria-label={`Marks for ${p.label}`}
                  className="w-16 shrink-0 rounded-lg bg-slate-50 p-1.5 text-center font-mono text-sm ring-1 ring-slate-200"
                  value={p.marks}
                  onChange={(e) =>
                    props.setDraft({ ...draft, points: draft.points.map((x, j) => (j === i ? { ...x, marks: Number(e.target.value) } : x)) })
                  }
                />
                <div className="min-w-0 text-sm">
                  <p className="font-medium">{p.label}</p>
                  <p className="mt-0.5 text-slate-500">{p.description}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className={cn("mt-3 text-sm font-medium tabular-nums", props.ok ? "text-emerald-700" : "text-rose-700")}>
            Total {fmt(props.sum)} / {draft.maxMarks} {props.ok ? "· ready" : "· edit the marks until they add up"}
          </p>
        </div>
      )}
    </Card>
  );
}
