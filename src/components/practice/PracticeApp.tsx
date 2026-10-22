"use client";

import { useEffect, useRef, useState } from "react";
import { answerProblem, countWords, MIN_ANSWER_CHARS } from "@/lib/answer";
import type { CatalogView } from "@/lib/catalog-types";
import type { AttemptResult, Rubric } from "@/lib/schema";
import { cn, fmt } from "@/lib/ui";
import { Button, Card, ErrorMessage, Icon, LoadingState, Pill, Textarea } from "../ui";
import { AnswerWorkspace } from "./AnswerWorkspace";
import { Breadcrumbs, LevelSelector, QuestionCard, SubjectBrowser, SubjectGrid, type Crumb } from "./Browse";
import Comparison from "./Comparison";
import LostMarksMap from "./LostMarksMap";

const CUSTOM = "__custom__";
const REQUEST_TIMEOUT_MS = 65_000;
const LEVEL_KEY = "markmate-level";

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

const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
};
const draftKey = (id: string) => `markmate-draft:${id}`;

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

export default function PracticeApp({ catalog }: { catalog: CatalogView }) {
  // Where the student is in Level → Subject → Chapter → Topic → Question.
  const [levelId, setLevelId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [questionId, setQuestionId] = useState<string | null>(null);

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
  const labRef = useRef<HTMLDivElement>(null);
  const cmpRef = useRef<HTMLDivElement>(null);

  const level = catalog.levels.find((l) => l.id === levelId) ?? null;
  const subject = level?.subjects.find((s) => s.id === subjectId) ?? null;
  const isCustom = questionId === CUSTOM;
  const question = !isCustom ? (catalog.questions.find((q) => q.id === questionId) ?? null) : null;
  const qSubject = question ? catalog.levels.flatMap((l) => l.subjects).find((s) => s.id === question.subjectId) : null;
  const draftSum = draft ? draft.points.reduce((s, p) => s + p.marks, 0) : 0;
  const draftOk = !!draft && Math.abs(draftSum - draft.maxMarks) < 1e-9;
  const maxMarks = isCustom ? (draftOk ? draft!.maxMarks : undefined) : (question?.maxMarks ?? undefined);
  const unavailable =
    question?.support === "none" ? "This question has no marking scheme in MarkMate yet, so it can't be given marks. You can still write and keep your answer here." : undefined;
  const inWorkspace = isCustom || !!question;

  // Remember the chosen level (read after mount so server and client render the same first).
  useEffect(() => {
    const saved = store.get(LEVEL_KEY);
    if (saved && catalog.levels.some((l) => l.id === saved)) setLevelId(saved);
  }, [catalog.levels]);

  // Each question keeps its own draft in this browser. Changing question also clears the previous question's results.
  useEffect(() => {
    setAnswer(questionId ? (store.get(draftKey(questionId)) ?? "") : "");
    setFirst(null);
    setSecond(null);
    setRewrite("");
    setFailure(null);
    setProblem(null);
    setTriedSubmit(false);
  }, [questionId]);
  useEffect(() => {
    if (questionId) store.set(draftKey(questionId), answer);
  }, [questionId, answer]);

  useEffect(() => {
    if (triedSubmit) setProblem(answerProblem(answer));
  }, [answer, triedSubmit]);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  /** Scroll a section into view, then put the cursor in a text box without jumping the page again. */
  const focusAfterScroll = (r: React.RefObject<HTMLElement | null>, inputId: string) => {
    r.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => (document.getElementById(inputId) as HTMLTextAreaElement | null)?.focus({ preventScroll: true }), 350);
  };
  const scrollTo = (r: React.RefObject<HTMLDivElement | null>) =>
    setTimeout(() => r.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);

  // Navigation. Each step clears everything below it, so no stale question or metadata survives a change.
  const locked = () => inFlight.current;
  function chooseLevel(id: string) {
    if (locked() || id === levelId) return;
    setLevelId(id);
    store.set(LEVEL_KEY, id);
    setSubjectId(null);
    setChapterId(null);
    setTopicId(null);
    setQuestionId(null);
  }
  function chooseSubject(id: string | null) {
    if (locked()) return;
    setSubjectId(id);
    setChapterId(null);
    setTopicId(null);
    setQuestionId(null);
    scrollTop();
  }
  function chooseChapter(id: string | null) {
    if (locked()) return;
    setChapterId(id);
    setTopicId(null);
    setQuestionId(null);
  }
  function chooseTopic(id: string | null) {
    if (locked()) return;
    setTopicId(id);
    setQuestionId(null);
  }
  function openQuestion(id: string) {
    if (locked()) return;
    setQuestionId(id);
    scrollTop();
  }
  function backToList() {
    if (locked()) return;
    setQuestionId(null);
    scrollTop();
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
    if (unavailable) return;
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
    if (inFlight.current || unavailable) return; // never send twice at once, never send an unsupported question
    inFlight.current = true;
    setBusy(attemptNo === 1 ? "mark1" : "mark2");
    setFailure(null);
    const text = attemptNo === 1 ? answer : rewrite;
    try {
      const body: Record<string, unknown> = { answer: text, sessionId: sessionId(), attemptNo };
      if (isCustom) body.rubric = draft;
      else body.questionId = questionId;
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

  /* ------------------------------- Browse view ------------------------------ */

  if (!inWorkspace) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 px-4 pb-24 pt-6 sm:px-6">
        <section aria-labelledby="level-heading">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="level-heading" className="text-[1.25rem] font-bold">
                {level ? "Your CA level" : "Start by choosing your CA level"}
              </h2>
              <p className="mt-0.5 text-[13px] text-muted">{catalog.source}</p>
            </div>
            <LevelSelector levels={catalog.levels} value={levelId} onChange={chooseLevel} />
          </div>
        </section>

        {level && !subject && (
          <section aria-labelledby="subject-heading" className="animate-fade-in">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <h2 id="subject-heading" className="text-[1.25rem] font-bold">
                {level.name} subjects
              </h2>
              <p className="text-[13px] text-muted">
                Evaluation is available for {level.subjects.filter((s) => s.stats.evaluable > 0).length} of {level.subjects.length} subjects at this level.
              </p>
            </div>
            <SubjectGrid level={level} onSelect={chooseSubject} />
            <CustomEntry onOpen={() => openQuestion(CUSTOM)} />
          </section>
        )}

        {level && subject && (
          <section className="animate-fade-in" aria-label={`${subject.name} questions`}>
            <SubjectBrowser
              level={level}
              subject={subject}
              questions={catalog.questions}
              chapterId={chapterId}
              topicId={topicId}
              onChapter={chooseChapter}
              onTopic={chooseTopic}
              onQuestion={openQuestion}
              onChangeSubject={() => chooseSubject(null)}
              onCustom={() => openQuestion(CUSTOM)}
            />
          </section>
        )}
      </div>
    );
  }

  /* ----------------------------- Workspace view ----------------------------- */

  const crumbs: Crumb[] = isCustom
    ? [{ label: "Practice", onClick: backToList }, { label: "Your own question" }]
    : (() => {
        const lv = catalog.levels.find((l) => l.id === question!.levelId)!;
        const ch = qSubject!.chapters.find((c) => c.id === question!.chapterId);
        const tp = ch?.topics.find((t) => t.id === question!.topicId);
        return [
          { label: lv.name, onClick: () => { setQuestionId(null); setSubjectId(null); } },
          { label: qSubject!.short ?? qSubject!.name, onClick: () => { setQuestionId(null); setChapterId(null); setTopicId(null); } },
          ...(ch ? [{ label: ch.name, onClick: () => { setQuestionId(null); setChapterId(ch.id); setTopicId(null); } }] : []),
          { label: tp?.name ?? question!.title },
        ];
      })();

  const step = second ? 4 : first ? (rewrite !== firstAnswer ? 3 : 2) : answer.trim() ? 1 : 0;
  const toRecover = first?.points.filter((p) => p.aiMarks < p.allocated) ?? [];
  const evaluating = busy === "mark1" || busy === "mark2";

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-6 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Breadcrumbs items={crumbs} />
        <Button variant="ghost" size="sm" onClick={backToList} disabled={evaluating} className="self-start">
          <Icon name="back" /> {isCustom ? "Back to subjects" : "Back to questions"}
        </Button>
      </div>
      <div className="mt-4">
        <Stepper step={step} />
      </div>

      <div className="mt-6 space-y-6">
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
          <QuestionCard q={question!} subjectName={qSubject!.short ?? qSubject!.name} />
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
          unavailable={unavailable}
        />

        <div aria-live="polite" className="space-y-4 empty:hidden">
          {busy === "mark1" && <LoadingState message="Evaluating your answer…" detail="Checking it against each marking point. This usually takes a few seconds." />}
          {failure?.attempt === 1 && busy !== "mark1" && <RetryError message={failure.message} onRetry={() => mark(1)} />}
        </div>

        <div ref={mapRef} className="scroll-mt-24">
          {first && busy !== "mark1" && (
            <LostMarksMap
              result={first}
              answer={firstAnswer}
              title="Attempt 1 · Your results"
              onImprove={() => focusAfterScroll(labRef, "rewrite")}
              onBackToAnswer={() => focusAfterScroll(editorRef, "answer")}
            />
          )}
        </div>

        {/* Improvement Lab */}
        {first && busy !== "mark1" && (
          <div ref={labRef} className="scroll-mt-24">
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
                  <Textarea id="rewrite" aria-label="Attempt 2" value={rewrite} onChange={(e) => setRewrite(e.target.value)} readOnly={busy === "mark2"} rows={14} className="flex-1 px-4" />
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
          </div>
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
  );
}

function CustomEntry({ onOpen }: { onOpen: () => void }) {
  return (
    <Card className="mt-4 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <span className="grid size-10 shrink-0 place-items-center rounded-control bg-subtle text-ink">
        <Icon name="question" className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-[16px] font-semibold">Practise with your own question</h3>
        <p className="mt-0.5 text-sm text-muted">
          For any subject: paste a question and its model answer. MarkMate drafts unverified marking points from the model answer, and you check them first.
        </p>
      </div>
      <Button variant="secondary" size="sm" onClick={onOpen} className="self-start sm:self-center">
        Use your own question
      </Button>
    </Card>
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
