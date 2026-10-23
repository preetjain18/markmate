"use client";

/**
 * Scan My Answer: 1) choose the question, 2) upload the answer sheet, 3) check what was read side by side,
 * then hand over to the practice workspace, where the existing pipeline marks it.
 */
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { answerProblem } from "@/lib/answer";
import type { CatalogView } from "@/lib/catalog-types";
import { practiceHref } from "@/lib/progress";
import { readScan, type ScanFile } from "@/lib/scan";
import { cn } from "@/lib/ui";
import { Alert, Badge, Button, Card, Field, Icon, Input, Textarea, type IconName } from "../ui";
import { PageUploader } from "./PageUploader";
import { TranscriptReview } from "./TranscriptReview";

type Source = "bank" | "typed" | "paper";
type Step = 0 | 1 | 2;

const AUTOEVAL_KEY = "markmate-autoeval";
const CUSTOM_PREFILL_KEY = "markmate-custom-prefill";

export default function ScanWizard({ catalog }: { catalog: CatalogView }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [source, setSource] = useState<Source>("bank");

  // Question bank
  const [levelId, setLevelId] = useState(catalog.levels[catalog.levels.length - 1]?.id ?? "");
  const level = catalog.levels.find((l) => l.id === levelId);
  const [subjectId, setSubjectId] = useState("");
  const [questionId, setQuestionId] = useState("");
  const subjectQuestions = useMemo(() => catalog.questions.filter((q) => q.subjectId === subjectId && q.support !== "none"), [catalog.questions, subjectId]);
  const question = catalog.questions.find((q) => q.id === questionId);

  // Typed or photographed question
  const [qText, setQText] = useState("");
  const [modelAnswer, setModelAnswer] = useState("");
  const [marks, setMarks] = useState(5);
  const [paperFiles, setPaperFiles] = useState<ScanFile[]>([]);
  const [paperBusy, setPaperBusy] = useState(false);
  const [paperError, setPaperError] = useState("");
  const [solFiles, setSolFiles] = useState<ScanFile[]>([]);
  const [solBusy, setSolBusy] = useState(false);
  const [solError, setSolError] = useState("");
  const [marksFromPaper, setMarksFromPaper] = useState(false);

  // Answer scan
  const [files, setFiles] = useState<ScanFile[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState("");
  const [text, setText] = useState("");
  const [model, setModel] = useState("");

  // Bring the newly shown details into view when the student switches source (the cards stack on phones).
  const detailsRef = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState(false);
  const pick = (s: Source) => {
    setSource(s);
    setPicked(true);
  };
  useEffect(() => {
    if (picked && source !== "bank") detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [source, picked]);

  const customOk = qText.trim().length >= 10 && modelAnswer.trim().length >= 30 && marks >= 1 && marks <= 20;
  const questionOk = source === "bank" ? !!question : customOk;
  const questionText = source === "bank" ? question?.text : qText.trim();
  const problem = text ? answerProblem(text) : null;

  /** Reads the question paper or the solution as soon as files are added. */
  async function readPaper(list: ScanFile[], mode: "question" | "solution") {
    if (!list.length) return;
    const [setBusy, setError] = mode === "question" ? [setPaperBusy, setPaperError] : [setSolBusy, setSolError];
    setBusy(true);
    setError("");
    try {
      const t = await readScan(list, { mode, question: mode === "solution" ? qText.trim() || undefined : undefined });
      if (mode === "question") {
        setQText(t.text);
        const m = t.text.match(/(\d+(?:\.5)?)\s*marks?\b/i);
        const n = m ? Number(m[1]) : NaN;
        if (n >= 1 && n <= 20) {
          setMarks(n);
          setMarksFromPaper(true);
        }
      } else {
        setModelAnswer(t.text);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function readAnswer() {
    setReading(true);
    setReadError("");
    setProgress(0);
    try {
      const t = await readScan(files, { question: questionText, onProgress: setProgress });
      setText(t.text);
      setModel(t.model);
      setStep(2);
    } catch (e) {
      setReadError((e as Error).message);
    } finally {
      setReading(false);
      setProgress(null);
    }
  }

  function finish() {
    if (problem) return;
    try {
      if (source === "bank" && question) {
        localStorage.setItem(`markmate-draft:${question.id}`, text);
        sessionStorage.setItem(AUTOEVAL_KEY, question.id);
        router.push(practiceHref({ level: question.levelId, subject: question.subjectId, chapter: question.chapterId, topic: question.topicId ?? undefined, question: question.id }));
      } else {
        localStorage.setItem("markmate-draft:__custom__", text);
        sessionStorage.setItem(CUSTOM_PREFILL_KEY, JSON.stringify({ question: qText.trim(), modelAnswer: modelAnswer.trim(), marks }));
        router.push("/practice?custom=1");
      }
    } catch {
      setReadError("Your browser blocked saving the answer for the next step. Allow site storage and try again.");
    }
  }

  return (
    <div className="space-y-8">
      <Steps step={step} />

      {/* Step 1: question */}
      {step === 0 && (
        <section aria-labelledby="s1" className="space-y-5">
          <div>
            <h2 id="s1" className="text-[1.375rem] font-bold">
              Which question did you answer?
            </h2>
            <p className="mt-1 text-[15px] text-muted">MarkMate marks your answer against that question&apos;s marking points, so it needs to know the question first.</p>
          </div>
          <div role="radiogroup" aria-label="Where the question comes from" className="grid gap-3 sm:grid-cols-3">
            <SourceCard on={source === "bank"} onClick={() => pick("bank")} icon="book" title="From the question bank" body="Questions for every Foundation, Inter and Final paper, each with a marking scheme ready." />
            <SourceCard on={source === "typed"} onClick={() => pick("typed")} icon="edit" title="Type the question" body="Paste any question with its model answer, e.g. an ICAI suggested answer you have." />
            <SourceCard on={source === "paper"} onClick={() => pick("paper")} icon="camera" title="Photo of the question paper" body="Upload photos of the question and its solution; we read both and set up the marking." />
          </div>

          {source === "bank" && (
            <Card className="grid gap-4 p-5 sm:grid-cols-3">
              <Field id="lvl" label="CA level">
                <Select id="lvl" value={levelId} onChange={(v) => { setLevelId(v); setSubjectId(""); setQuestionId(""); }} options={catalog.levels.map((l) => [l.id, l.name])} />
              </Field>
              <Field id="sub" label="Paper">
                <Select id="sub" value={subjectId} placeholder="Choose a paper" onChange={(v) => { setSubjectId(v); setQuestionId(""); }} options={(level?.subjects ?? []).filter((s) => s.stats.evaluable > 0).map((s) => [s.id, `${s.paper ? s.paper + " · " : ""}${s.short ?? s.name}`])} />
              </Field>
              <Field id="q" label="Question">
                <Select id="q" value={questionId} placeholder={subjectId ? "Choose a question" : "Choose a paper first"} disabled={!subjectId} onChange={setQuestionId} options={subjectQuestions.map((q) => [q.id, q.title])} />
              </Field>
              {question && (
                <div className="sm:col-span-3">
                  <p className="rounded-control bg-canvas p-3.5 text-[15px] leading-relaxed text-ink ring-1 ring-inset ring-line">{question.text}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-muted">
                    <Badge tone="neutral">{question.maxMarks} marks</Badge> {question.source ? `Marking scheme based on ${question.source}.` : "Marking scheme ready."}
                  </p>
                </div>
              )}
            </Card>
          )}

          {source === "paper" && (
            <div ref={detailsRef} className="scroll-mt-24 space-y-4">
              <PhotoStep
                n={1}
                title="Upload the question"
                body="A photo or PDF of the question you answered. We read it as soon as it's added."
                label="question paper"
                files={paperFiles}
                onFiles={(next) => {
                  const added = next.length > paperFiles.length;
                  setPaperFiles(next);
                  if (added) void readPaper(next, "question");
                }}
                busy={paperBusy}
                busyText="Reading the question…"
                error={paperError}
                onRetry={() => void readPaper(paperFiles, "question")}
                textId="qt"
                textLabel="Question"
                textHint="Read from your photo. Check it and fix anything misread. If the page has several questions, keep only the one you answered."
                text={qText}
                onText={setQText}
                rows={4}
              />
              <PhotoStep
                n={2}
                title="Upload the solution"
                body="A photo or PDF of the model or suggested answer. MarkMate turns it into marking points."
                label="solution"
                files={solFiles}
                onFiles={(next) => {
                  const added = next.length > solFiles.length;
                  setSolFiles(next);
                  if (added) void readPaper(next, "solution");
                }}
                busy={solBusy}
                busyText="Reading the solution…"
                error={solError}
                onRetry={() => void readPaper(solFiles, "solution")}
                textId="ma"
                textLabel="Solution"
                textHint="Read from your photo. Check it and fix anything misread."
                text={modelAnswer}
                onText={setModelAnswer}
                rows={8}
              />
              <Card className="space-y-2 p-5">
                <h3 className="flex items-center gap-2 font-display text-[17px] font-semibold">
                  <span className="grid size-6 place-items-center rounded-full bg-brand text-[13px] text-white">3</span> Total marks
                </h3>
                <Input id="mk" aria-label="Total marks" type="number" min={1} max={20} step={0.5} value={marks} onChange={(e) => { setMarks(Number(e.target.value)); setMarksFromPaper(false); }} className="w-28" />
                <p className="text-[13px] text-muted">
                  {marksFromPaper ? "Taken from the question paper. Change it if it's wrong." : "How many marks the question carries."} You&apos;ll check the marking points drafted from the solution before your answer is marked.
                </p>
              </Card>
            </div>
          )}

          {source === "typed" && (
            <div ref={detailsRef} className="scroll-mt-24">
            <Card className="space-y-4 p-5">
              <Field id="qt" label="Question">
                <Textarea id="qt" rows={4} value={qText} onChange={(e) => setQText(e.target.value)} placeholder="The exam question" />
              </Field>
              <Field id="ma" label="Model answer" hint="Needed to build the marking points. Paste a suggested answer you have access to.">
                <Textarea id="ma" rows={6} value={modelAnswer} onChange={(e) => setModelAnswer(e.target.value)} placeholder="The model or suggested answer" />
              </Field>
              <Field id="mk" label="Total marks">
                <Input id="mk" type="number" min={1} max={20} step={0.5} value={marks} onChange={(e) => setMarks(Number(e.target.value))} className="w-28" />
              </Field>
              <p className="text-[13px] text-muted">You&apos;ll check the drafted marking points before your answer is marked. They&apos;re labelled unverified.</p>
            </Card>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={() => setStep(1)} disabled={!questionOk}>
              Next: upload your answer <Icon name="arrow" />
            </Button>
          </div>
        </section>
      )}

      {/* Step 2: upload */}
      {step === 1 && (
        <section aria-labelledby="s2" className="space-y-5">
          <QuestionSummary text={questionText ?? ""} onChange={() => setStep(0)} />
          <div>
            <h2 id="s2" className="text-[1.375rem] font-bold">
              Upload your handwritten answer
            </h2>
            <p className="mt-1 text-[15px] text-muted">Photograph each page flat, in good light, with the whole page in view. Put the pages in order.</p>
          </div>
          <PageUploader files={files} onChange={setFiles} disabled={reading} />
          {reading && (
            <div aria-live="polite" className="space-y-2">
              <div className="h-2 overflow-hidden rounded-full bg-subtle">
                <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${progress !== null && progress < 100 ? progress : 100}%` }} />
              </div>
              <p className="text-[13px] text-muted">{progress !== null && progress < 100 ? `Uploading… ${progress}%` : "Reading your handwriting… this usually takes 5–20 seconds."}</p>
            </div>
          )}
          {readError && (
            <Alert tone="error" title="Your answer wasn't read">
              {readError} Your files are still here.
            </Alert>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button variant="ghost" onClick={() => setStep(0)} disabled={reading}>
              <Icon name="back" /> Back
            </Button>
            <Button onClick={readAnswer} disabled={!files.length || reading}>
              {reading ? <><Icon name="loader" className="animate-spin" /> Reading…</> : readError ? <><Icon name="refresh" /> Try again</> : <>Read my answer <Icon name="arrow" /></>}
            </Button>
          </div>
          <p className="text-[12px] text-muted">Files are sent to Google Gemini to read the handwriting and aren&apos;t stored by MarkMate.</p>
        </section>
      )}

      {/* Step 3: review */}
      {step === 2 && (
        <section aria-labelledby="s3" className="space-y-5">
          <QuestionSummary text={questionText ?? ""} onChange={() => setStep(0)} />
          <div>
            <h2 id="s3" className="text-[1.375rem] font-bold">
              Check what we read
            </h2>
            <p className="mt-1 text-[15px] text-muted">Compare the text with your sheet. Fix anything misread: your marks will be based on this text.</p>
          </div>
          <TranscriptReview files={files} text={text} onText={setText} model={model} />
          {problem && <Alert tone="attention">{problem}</Alert>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              <Icon name="back" /> Re-upload pages
            </Button>
            <Button onClick={finish} disabled={!!problem}>
              {source === "bank" ? "Evaluate my answer" : "Next: check the marking points"} <Icon name="arrow" />
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

const STEP_NAMES = ["Question", "Upload", "Check", "Lost Marks Map"];

function Steps({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto pb-1 text-sm" aria-label="Scan steps">
      {STEP_NAMES.map((s, i) => (
        <li key={s} className="flex shrink-0 items-center gap-2" aria-current={i === step ? "step" : undefined}>
          <span className={cn("grid size-7 place-items-center rounded-full text-xs font-semibold", i < step ? "bg-mint text-brand" : i === step ? "bg-brand text-white" : "bg-surface text-muted ring-1 ring-line")}>
            {i < step ? <Icon name="check" className="size-3.5" /> : i + 1}
          </span>
          <span className={cn(i === step ? "font-medium text-ink" : "text-muted", i !== step && "hidden sm:inline")}>{s}</span>
          {i < STEP_NAMES.length - 1 && <span className="h-px w-6 bg-line sm:w-12" />}
        </li>
      ))}
    </ol>
  );
}

function SourceCard({ on, onClick, icon, title, body }: { on: boolean; onClick: () => void; icon: IconName; title: string; body: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        "flex h-full flex-col rounded-card p-4 text-left ring-1 ring-inset transition-colors",
        on ? "bg-mint/60 ring-2 ring-brand" : "bg-surface ring-line hover:ring-line-strong",
      )}
    >
      <span className={cn("grid size-9 place-items-center rounded-control", on ? "bg-brand text-white" : "bg-subtle text-ink")}>
        <Icon name={icon} />
      </span>
      <span className="mt-3 font-display text-[15px] font-semibold text-ink">{title}</span>
      <span className="mt-1 text-[13px] leading-relaxed text-muted">{body}</span>
    </button>
  );
}

/** One numbered upload in the photo path: upload, read automatically, then check the text (or type it instead). */
function PhotoStep(p: {
  n: number;
  title: string;
  body: string;
  label: string;
  files: ScanFile[];
  onFiles: (files: ScanFile[]) => void;
  busy: boolean;
  busyText: string;
  error: string;
  onRetry: () => void;
  textId: string;
  textLabel: string;
  textHint: string;
  text: string;
  onText: (t: string) => void;
  rows: number;
}) {
  const [typing, setTyping] = useState(false);
  const showText = typing || p.text.length > 0;
  return (
    <Card className="space-y-3 p-5">
      <div>
        <h3 className="flex items-center gap-2 font-display text-[17px] font-semibold">
          <span className={cn("grid size-6 place-items-center rounded-full text-[13px] text-white", p.text ? "bg-success" : "bg-brand")}>
            {p.text ? <Icon name="check" className="size-3.5" /> : p.n}
          </span>
          {p.title}
        </h3>
        <p className="mt-0.5 text-[14px] text-muted">{p.body}</p>
      </div>
      <PageUploader files={p.files} onChange={p.onFiles} disabled={p.busy} label={p.label} />
      {p.busy && (
        <p aria-live="polite" className="flex items-center gap-2 text-[14px] font-medium text-brand">
          <Icon name="loader" className="animate-spin" /> {p.busyText}
        </p>
      )}
      {p.error && (
        <Alert tone="error">
          {p.error}{" "}
          {p.files.length > 0 && (
            <button type="button" onClick={p.onRetry} className="font-semibold underline underline-offset-2">
              Try again
            </button>
          )}
        </Alert>
      )}
      {showText ? (
        <Field id={p.textId} label={p.textLabel} hint={p.text && !typing ? p.textHint : undefined}>
          <Textarea id={p.textId} rows={p.rows} value={p.text} onChange={(e) => p.onText(e.target.value)} />
        </Field>
      ) : (
        !p.busy && (
          <button type="button" onClick={() => setTyping(true)} className="text-[13px] font-medium text-brand underline underline-offset-2">
            No photo? Type it instead
          </button>
        )
      )}
    </Card>
  );
}

function QuestionSummary({ text, onChange }: { text: string; onChange: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-muted">Question</p>
        <p className="mt-0.5 line-clamp-2 text-[15px] text-ink">{text}</p>
      </div>
      <button type="button" onClick={onChange} className="shrink-0 rounded text-[13px] font-medium text-brand hover:underline">
        Change
      </button>
    </div>
  );
}

function Select({
  id,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-control bg-surface px-3 text-[15px] text-ink ring-1 ring-inset ring-line-strong focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-subtle disabled:text-muted"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}
