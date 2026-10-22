"use client";

import { useEffect, useRef, useState } from "react";
import { answerProblem, countWords, MIN_ANSWER_CHARS } from "@/lib/answer";
import type { AttemptResult, Rubric } from "@/lib/schema";
import { cn, fmt } from "@/lib/ui";
import { Button, Card, ErrorMessage, Icon, LoadingState, Pill, Textarea } from "../ui";
import { AnswerWorkspace } from "./AnswerWorkspace";
import Comparison from "./Comparison";
import LostMarksMap from "./LostMarksMap";
import { CUSTOM, QuestionCard, QuestionPanel, type QuestionItem } from "./QuestionPanel";

export type { QuestionItem };

const REQUEST_TIMEOUT_MS = 65_000;

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

/** POST JSON with a timeout. Turns network, timeout and server failures into messages a student can act on. */
async function post<T>(url: string, body: unknown): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ctrl.signal });
  } catch {
    throw new Error(
      ctrl.signal.aborted
        ? "Evaluation took too long and was stopped. Please try again."
        : "Couldn't reach MarkMate. Check your internet connection and try again.",
    );
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || (res.status >= 500 ? "MarkMate couldn't evaluate this answer right now. Please try again." : "That request couldn't be processed."));
  }
  if (!data) throw new Error("MarkMate sent back a response it couldn't read. Please try again.");
  return data as T;
}

type Busy = null | "mark1" | "mark2" | "draft";

export default function PracticeApp({ questions }: { questions: QuestionItem[] }) {
  const [selected, setSelected] = useState(questions[0]?.id ?? CUSTOM);
  const [answer, setAnswer] = useState("");
  const [rewrite, setRewrite] = useState("");
  const [first, setFirst] = useState<AttemptResult | null>(null);
  const [firstAnswer, setFirstAnswer] = useState("");
  const [second, setSecond] = useState<AttemptResult | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [failure, setFailure] = useState<{ attempt: 1 | 2; message: string } | null>(null);
  const [draftError, setDraftError] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [triedSubmit, setTriedSubmit] = useState(false);

  const [cQuestion, setCQuestion] = useState("");
  const [cModel, setCModel] = useState("");
  const [cMarks, setCMarks] = useState(5);
  const [draft, setDraft] = useState<Rubric | null>(null);

  const inFlight = useRef(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const cmpRef = useRef<HTMLDivElement>(null);

  const isCustom = selected === CUSTOM;
  const currentIndex = questions.findIndex((q) => q.id === selected);
  const current = questions[currentIndex];
  const draftSum = draft ? draft.points.reduce((s, p) => s + p.marks, 0) : 0;
  const draftOk = !!draft && Math.abs(draftSum - draft.maxMarks) < 1e-9;
  const maxMarks = isCustom ? (draftOk ? draft!.maxMarks : undefined) : current?.maxMarks;

  // Restore the draft kept in this browser when the question changes, and keep it up to date.
  useEffect(() => {
    setAnswer(loadDraft(selected));
  }, [selected]);
  useEffect(() => {
    saveDraft(selected, answer);
  }, [selected, answer]);

  // After a failed submit, re-check as the student types so the message clears as soon as it's fixed.
  useEffect(() => {
    if (triedSubmit) setProblem(answerProblem(answer));
  }, [answer, triedSubmit]);

  const scrollTo = (r: React.RefObject<HTMLDivElement | null>) =>
    setTimeout(() => r.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);

  function pick(id: string) {
    if (id === selected || inFlight.current) return;
    setSelected(id);
    setFirst(null);
    setSecond(null);
    setRewrite("");
    setFailure(null);
    setProblem(null);
    setTriedSubmit(false);
  }

  async function makeDraft() {
    setBusy("draft");
    setDraftError("");
    try {
      const d = await post<{ rubric: Rubric }>("/api/rubric", { question: cQuestion, modelAnswer: cModel, maxMarks: cMarks });
      setDraft(d.rubric);
    } catch (e) {
      setDraftError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function submitFirst() {
    setTriedSubmit(true);
    const p = isCustom && !draftOk ? "Draft the marking points and make the marks add up before evaluating." : answerProblem(answer);
    setProblem(p);
    if (p) {
      editorRef.current?.focus();
      return;
    }
    void mark(1);
  }

  async function mark(attemptNo: 1 | 2) {
    if (inFlight.current) return; // never send the same answer twice at once
    inFlight.current = true;
    setBusy(attemptNo === 1 ? "mark1" : "mark2");
    setFailure(null);
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
      setFailure({ attempt: attemptNo, message: (e as Error).message });
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  }

  const step = second ? 4 : first ? (rewrite !== firstAnswer ? 3 : 2) : answer.trim() ? 1 : 0;
  const toRecover = first?.points.filter((p) => p.aiMarks < p.allocated) ?? [];
  const evaluating = busy === "mark1" || busy === "mark2";

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6">
      <Stepper step={step} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr] lg:gap-8">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <QuestionPanel questions={questions} selected={selected} onSelect={pick} disabled={evaluating} />
        </aside>

        <div className="min-w-0 space-y-6">
          {isCustom ? (
            <>
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
              {draftError && <ErrorMessage title="Couldn't draft the marking points">{draftError}</ErrorMessage>}
            </>
          ) : (
            current && <QuestionCard q={current} index={currentIndex} />
          )}

          <AnswerWorkspace
            ref={editorRef}
            value={answer}
            onChange={setAnswer}
            onSubmit={submitFirst}
            maxMarks={maxMarks}
            busy={busy === "mark1"}
            problem={problem}
            hasResult={!!first}
          />

          {/* Evaluation status for the first attempt */}
          <div aria-live="polite" className="space-y-4 empty:hidden">
            {busy === "mark1" && (
              <LoadingState message="Evaluating your answer…" detail="Checking it against each marking point. This usually takes a few seconds." />
            )}
            {failure?.attempt === 1 && busy !== "mark1" && (
              <RetryError message={failure.message} onRetry={() => mark(1)} />
            )}
          </div>

          <div ref={mapRef} className="scroll-mt-24">
            {first && busy !== "mark1" && <LostMarksMap result={first} answer={firstAnswer} title="Attempt 1 · Lost Marks Map" />}
          </div>

          {/* Improvement Lab */}
          {first && busy !== "mark1" && (
            <Card className="animate-fade-in overflow-hidden">
              <div className="border-b border-line p-5 sm:p-7">
                <p className="font-display text-sm font-semibold text-brand-600">Improvement Lab</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">Rewrite and win the marks back</h2>
                <p className="mt-1 text-sm text-muted">Your rewrite is re-marked with exactly the same marking scheme, so the comparison is fair.</p>
              </div>
              <div className="grid gap-0 lg:grid-cols-[1fr_1.3fr]">
                <div className="border-b border-line p-5 lg:border-b-0 lg:border-r sm:p-7">
                  <p className="text-sm font-medium">{toRecover.length ? `${toRecover.length} point${toRecover.length > 1 ? "s" : ""} to fix` : "Nothing to fix"}</p>
                  <ul className="mt-3 space-y-3">
                    {toRecover.map((p) => (
                      <li key={p.pointId} className="rounded-xl bg-canvas p-3 ring-1 ring-line">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-snug">{p.label}</p>
                          <span className="shrink-0 font-mono text-xs text-error">−{fmt(p.allocated - p.aiMarks)}</span>
                        </div>
                        {p.toRecover && <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{p.toRecover}</p>}
                      </li>
                    ))}
                    {!toRecover.length && <li className="text-sm text-muted">You secured every point. Try another question.</li>}
                  </ul>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center justify-between px-5 pt-4 sm:px-7">
                    <p className="text-sm font-medium">Attempt 2</p>
                    <p className="text-xs tabular-nums text-muted">
                      {countWords(rewrite)} words ({countWords(rewrite) - countWords(firstAnswer) >= 0 ? "+" : ""}
                      {countWords(rewrite) - countWords(firstAnswer)})
                    </p>
                  </div>
                  <div className="mt-3 flex flex-1 px-5 sm:px-7">
                    <Textarea aria-label="Attempt 2" value={rewrite} onChange={(e) => setRewrite(e.target.value)} readOnly={busy === "mark2"} rows={14} className="flex-1 px-4" />
                  </div>
                  <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-7">
                    <p className="text-xs text-muted">Extra length alone earns nothing.</p>
                    <Button
                      onClick={() => mark(2)}
                      disabled={!!busy || rewrite.trim().length < MIN_ANSWER_CHARS || rewrite.trim() === firstAnswer.trim()}
                      aria-busy={busy === "mark2"}
                    >
                      {busy === "mark2" ? "Re-marking…" : "Re-mark my rewrite"} <Icon name="arrow" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          <div aria-live="polite" className="space-y-4 empty:hidden">
            {busy === "mark2" && <LoadingState message="Re-marking your rewrite…" detail="Using the same marking scheme as your first attempt." />}
            {failure?.attempt === 2 && busy !== "mark2" && <RetryError message={failure.message} onRetry={() => mark(2)} />}
          </div>

          <div ref={cmpRef} className="scroll-mt-24 space-y-6">
            {first && second && busy !== "mark2" && (
              <>
                <Comparison first={first} second={second} />
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-muted hover:text-ink">
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

function RetryError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="space-y-3">
      <ErrorMessage title="Your answer wasn't evaluated">
        {message} Your answer is still here, so nothing is lost.
      </ErrorMessage>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        <Icon name="refresh" /> Try again
      </Button>
    </div>
  );
}

const STEPS = ["Question", "Answer", "Lost Marks Map", "Improvement Lab", "Compare"];

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto pb-1 text-sm" aria-label="Progress">
      {STEPS.map((s, i) => (
        <li key={s} className="flex shrink-0 items-center gap-2" aria-current={i === step ? "step" : undefined}>
          <span
            className={cn(
              "grid size-6 place-items-center rounded-full text-xs font-semibold transition",
              i < step ? "bg-mint text-brand" : i === step ? "bg-brand text-white" : "bg-surface text-muted ring-1 ring-line",
            )}
          >
            {i < step ? <Icon name="check" className="size-3.5" /> : i + 1}
          </span>
          <span className={cn(i === step ? "font-medium text-ink" : "text-muted", i !== step && "hidden sm:inline")}>{s}</span>
          {i < STEPS.length - 1 && <span className="h-px w-6 bg-line sm:w-10" />}
        </li>
      ))}
    </ol>
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
  const field =
    "w-full rounded-control bg-surface px-3.5 py-3 text-[15px] leading-relaxed ring-1 ring-inset ring-line-strong transition-shadow placeholder:text-muted/70 hover:ring-muted/50 focus:outline-none focus:ring-2 focus:ring-brand";
  return (
    <Card className="p-6 sm:p-7">
      <p className="font-display text-sm font-semibold text-brand-600">Your own question</p>
      <h2 className="mt-1 text-xl font-semibold tracking-tight">Paste a question and its model answer</h2>
      <p className="mt-1 text-sm text-muted">MarkMate drafts marking points from the model answer. You check the marks before your answer is marked.</p>
      <div className="mt-5 space-y-3">
        <textarea aria-label="Question" className={field} rows={3} placeholder="The question" value={props.q} onChange={(e) => props.setQ(e.target.value)} />
        <textarea
          aria-label="Model answer"
          className={field}
          rows={7}
          placeholder="The model answer, for example from the ICAI Suggested Answer"
          value={props.model}
          onChange={(e) => props.setModel(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            Total marks
            <input
              type="number"
              min={1}
              max={20}
              step={0.5}
              className="h-10 w-20 rounded-control bg-surface px-2.5 ring-1 ring-inset ring-line-strong focus:outline-none focus:ring-2 focus:ring-brand"
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
        <div className="mt-6 animate-fade-in rounded-card bg-canvas p-4 ring-1 ring-line sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Marking points</p>
            <Pill className="bg-warning-soft text-warning ring-accent/30">Unverified</Pill>
          </div>
          <ul className="mt-3 space-y-2">
            {draft.points.map((p, i) => (
              <li key={p.id} className="flex items-start gap-3 rounded-xl bg-surface p-3 ring-1 ring-line">
                <input
                  type="number"
                  step={0.5}
                  min={0.5}
                  aria-label={`Marks for ${p.label}`}
                  className="h-9 w-16 shrink-0 rounded-control bg-surface text-center font-mono text-sm ring-1 ring-inset ring-line-strong focus:outline-none focus:ring-2 focus:ring-brand"
                  value={p.marks}
                  onChange={(e) =>
                    props.setDraft({ ...draft, points: draft.points.map((x, j) => (j === i ? { ...x, marks: Number(e.target.value) } : x)) })
                  }
                />
                <div className="min-w-0 text-sm">
                  <p className="font-medium">{p.label}</p>
                  <p className="mt-0.5 text-muted">{p.description}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className={cn("mt-3 text-sm font-medium tabular-nums", props.ok ? "text-success" : "text-error")}>
            Total {fmt(props.sum)} / {draft.maxMarks} {props.ok ? "· ready" : "· edit the marks until they add up"}
          </p>
        </div>
      )}
    </Card>
  );
}
