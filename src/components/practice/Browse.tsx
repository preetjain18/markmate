"use client";

/**
 * Progressive question selection: CA level → subject → chapter → topic → question.
 * Everything shown comes from the catalog (data/catalog.json + rubric/question files).
 */
import {
  STATUS_TEXT,
  SUPPORT_TEXT,
  type ChapterView,
  type EvalSupport,
  type LevelView,
  type QuestionView,
  type SubjectStatus,
  type SubjectView,
} from "@/lib/catalog-types";
import { cn, type Tone } from "@/lib/ui";
import { Badge, Button, Card, EmptyState, Icon, type IconName } from "../ui";

const CATEGORY_ICON: Record<string, IconName> = {
  accounting: "calculator",
  law: "scale",
  tax: "receipt",
  audit: "audit",
  cost: "factory",
  finance: "trend",
  economics: "landmark",
  maths: "sigma",
  strategy: "briefcase",
};

const STATUS_TONE: Record<SubjectStatus, Tone> = { verified: "success", evaluation: "brand", practice: "neutral", "coming-soon": "neutral" };
const SUPPORT_TONE: Record<EvalSupport, Tone> = { verified: "success", unverified: "brand", none: "attention" };

export function SupportBadge({ support }: { support: EvalSupport }) {
  return (
    <Badge tone={SUPPORT_TONE[support]}>
      <Icon name={support === "verified" ? "shield" : support === "none" ? "alert" : "check"} className="size-3.5" />
      {SUPPORT_TEXT[support]}
    </Badge>
  );
}

/** The law or standard a question's marking scheme is based on. */
function SourceBadge({ source }: { source: string }) {
  return (
    <Badge tone="neutral" wrap>
      <Icon name="book" className="size-3.5" />
      {source}
    </Badge>
  );
}

/* --------------------------------- Level -------------------------------- */

export function LevelSelector({ levels, value, onChange }: { levels: LevelView[]; value: string | null; onChange: (id: string) => void }) {
  return (
    <div role="group" aria-label="CA level" className="grid grid-cols-3 gap-1 rounded-card bg-subtle p-1 sm:inline-grid sm:min-w-[30rem]">
      {levels.map((l) => {
        const on = l.id === value;
        return (
          <button
            key={l.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(l.id)}
            className={cn(
              "rounded-control px-2 py-2.5 font-display text-[14px] font-semibold transition-colors sm:px-4 sm:text-[15px]",
              on ? "bg-brand text-white shadow-soft" : "text-muted hover:bg-surface hover:text-ink",
            )}
          >
            {l.name.replace("CA ", "")}
            <span className="sr-only"> level</span>
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------- Subjects ------------------------------- */

export function SubjectGrid({ level, onSelect }: { level: LevelView; onSelect: (id: string) => void }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {level.subjects.map((s) => {
        const ready = s.status === "evaluation" || s.status === "verified";
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSelect(s.id)}
              className={cn(
                "group flex h-full w-full flex-col rounded-card bg-surface p-5 text-left ring-1 ring-line shadow-soft transition-[box-shadow,background-color] duration-150 hover:shadow-lift hover:ring-line-strong",
                !ready && "bg-surface/70",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-control", ready ? "bg-mint text-brand" : "bg-subtle text-muted")}>
                  <Icon name={CATEGORY_ICON[s.category] ?? "book"} className="size-5" />
                </span>
                {!ready && <Badge tone={STATUS_TONE[s.status]}>{STATUS_TEXT[s.status].label}</Badge>}
              </div>
              {s.paper && <p className="mt-4 text-[13px] text-muted">{s.paper}</p>}
              <h3 className="mt-0.5 text-[17px] font-semibold leading-snug">{s.name}</h3>
              <p className="mt-auto flex items-center gap-1.5 pt-3 text-[13px] text-muted">
                {s.stats.questions > 0 ? (
                  <>
                    <Icon name="folder" className="size-3.5" /> {s.chapters.length} chapter{s.chapters.length === 1 ? "" : "s"}
                    <span aria-hidden>·</span>
                    {s.stats.questions} question{s.stats.questions === 1 ? "" : "s"}
                  </>
                ) : (
                  "No questions added yet"
                )}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                Open subject <Icon name="arrow" className="size-3.5" />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ----------------------- Chapters, topics, questions ---------------------- */

export function SubjectBrowser({
  level,
  subject,
  questions,
  chapterId,
  topicId,
  onChapter,
  onTopic,
  onQuestion,
  onChangeSubject,
  onCustom,
}: {
  level: LevelView;
  subject: SubjectView;
  questions: QuestionView[];
  chapterId: string | null;
  topicId: string | null;
  onChapter: (id: string | null) => void;
  onTopic: (id: string | null) => void;
  onQuestion: (id: string) => void;
  onChangeSubject: () => void;
  onCustom: () => void;
}) {
  const chapter = subject.chapters.find((c) => c.id === chapterId) ?? null;
  const topic = chapter?.topics.find((t) => t.id === topicId) ?? null;
  const shown = questions.filter(
    (q) => q.subjectId === subject.id && (!chapter || q.chapterId === chapter.id) && (!topic || q.topicId === topic.id),
  );

  return (
    <div className="space-y-5">
      {/* Subject header */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-control bg-mint text-brand">
              <Icon name={CATEGORY_ICON[subject.category] ?? "book"} className="size-5" />
            </span>
            <div>
              <p className="text-[13px] text-muted">
                {level.name}
                {subject.paper && ` · ${subject.paper}`}
              </p>
              <h2 className="text-[1.375rem] font-bold leading-tight">{subject.name}</h2>
              <p className="mt-1.5 text-sm text-muted">{STATUS_TEXT[subject.status].detail}</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={onChangeSubject} className="self-start">
            <Icon name="back" /> Change subject
          </Button>
        </div>
      </Card>

      {subject.chapters.length === 0 ? (
        <EmptyState
          icon="folder"
          title={`No chapters or questions for ${subject.short ?? subject.name} yet`}
          description="Questions for this paper haven't been added yet. You can still practise it by pasting your own question and its model answer."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" onClick={onCustom}>
                <Icon name="edit" /> Use your own question
              </Button>
              <Button size="sm" variant="secondary" onClick={onChangeSubject}>
                Choose another subject
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
          <ChapterList chapters={subject.chapters} total={subject.stats.questions} value={chapterId} onChange={onChapter} note={subject.chapterNote} />

          <div className="min-w-0 space-y-4">
            {chapter && chapter.topics.length > 1 && <TopicFilter chapter={chapter} value={topicId} onChange={onTopic} />}

            <ActiveFilters
              subject={subject.short ?? subject.name}
              chapter={chapter}
              topic={topic?.name ?? null}
              count={shown.length}
              onClearChapter={() => onChapter(null)}
              onClearTopic={() => onTopic(null)}
            />

            {shown.length === 0 ? (
              <EmptyState
                icon="inbox"
                title="No questions in this chapter yet"
                description={`${chapter ? `${chapter.name}${chapter.note ? ` (${chapter.note})` : ""}` : "This selection"} doesn't have any practice questions so far.`}
                action={
                  <Button size="sm" variant="secondary" onClick={() => onChapter(null)}>
                    See all chapters
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-2.5" aria-label="Questions">
                {shown.map((q) => (
                  <li key={q.id}>
                    <QuestionRow q={q} chapterName={subject.chapters.find((c) => c.id === q.chapterId)?.name} onOpen={() => onQuestion(q.id)} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ChapterList({
  chapters,
  total,
  value,
  onChange,
  note,
}: {
  chapters: ChapterView[];
  total: number;
  value: string | null;
  onChange: (id: string | null) => void;
  note?: string;
}) {
  const item = (id: string | null, name: string, count: number, sub?: string) => {
    const on = value === id;
    return (
      <li key={id ?? "all"}>
        <button
          type="button"
          onClick={() => onChange(id)}
          aria-current={on ? "true" : undefined}
          className={cn(
            "flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left transition-colors focus-visible:-outline-offset-2",
            on ? "bg-mint" : "hover:bg-canvas",
          )}
        >
          <span className="min-w-0">
            <span className={cn("block text-[14px] leading-snug", on ? "font-semibold text-brand" : "font-medium text-ink")}>{name}</span>
            {sub && <span className="block text-[12px] text-muted">{sub}</span>}
          </span>
          <span className={cn("mt-0.5 shrink-0 font-mono text-[12px] tabular-nums", count ? "text-muted" : "text-muted/60")}>{count}</span>
        </button>
      </li>
    );
  };
  return (
    <div className="lg:sticky lg:top-24 lg:self-start">
      <h3 className="font-display text-[15px] font-semibold">Chapters</h3>
      {note && <p className="mt-1 text-[12px] leading-snug text-muted">{note}</p>}

      <label htmlFor="chapter-select" className="sr-only">
        Chapter
      </label>
      <select
        id="chapter-select"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="mt-3 h-11 w-full rounded-control bg-surface px-3 text-[15px] ring-1 ring-inset ring-line-strong focus:outline-none focus:ring-2 focus:ring-brand lg:hidden"
      >
        <option value="">All chapters ({total})</option>
        {chapters.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.note ? ` · ${c.note}` : ""} ({c.count})
          </option>
        ))}
      </select>

      <Card className="mt-3 hidden overflow-hidden lg:block">
        <ul className="divide-y divide-line">
          {item(null, "All chapters", total)}
          {chapters.map((c) => item(c.id, c.name, c.count, c.note))}
        </ul>
      </Card>
    </div>
  );
}

function TopicFilter({ chapter, value, onChange }: { chapter: ChapterView; value: string | null; onChange: (id: string | null) => void }) {
  const chip = (id: string | null, label: string, count?: number) => {
    const on = value === id;
    return (
      <button
        key={id ?? "all"}
        type="button"
        aria-pressed={on}
        onClick={() => onChange(id)}
        className={cn(
          "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium ring-1 ring-inset transition-colors",
          on ? "bg-brand text-white ring-brand" : "bg-surface text-ink ring-line-strong hover:bg-canvas",
        )}
      >
        {label}
        {count !== undefined && <span className={cn("tabular-nums", on ? "text-white/75" : "text-muted")}>{count}</span>}
      </button>
    );
  };
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-muted">
        <Icon name="filter" className="size-3.5" /> Topics
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Topic filter">
        {chip(null, "All topics")}
        {chapter.topics.map((t) => chip(t.id, t.name, t.count))}
      </div>
    </div>
  );
}

function ActiveFilters({
  subject,
  chapter,
  topic,
  count,
  onClearChapter,
  onClearTopic,
}: {
  subject: string;
  chapter: ChapterView | null;
  topic: string | null;
  count: number;
  onClearChapter: () => void;
  onClearTopic: () => void;
}) {
  const tag = (label: string, onClear: () => void, what: string) => (
    <span className="inline-flex items-center gap-1 rounded-full bg-mint py-1 pl-3 pr-1 text-[13px] font-medium text-brand">
      {label}
      <button type="button" onClick={onClear} aria-label={`Remove ${what} filter`} className="grid size-5 place-items-center rounded-full hover:bg-brand/10">
        <Icon name="x" className="size-3.5" />
      </button>
    </span>
  );
  return (
    <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted" aria-live="polite">
      <span>
        Showing <strong className="font-semibold text-ink">{count}</strong> {count === 1 ? "question" : "questions"} in
      </span>
      <span className="rounded-full bg-subtle px-3 py-1 font-medium text-ink">{subject}</span>
      {chapter && tag(chapter.name, onClearChapter, "chapter")}
      {topic && tag(topic, onClearTopic, "topic")}
    </div>
  );
}

function QuestionRow({ q, chapterName, onOpen }: { q: QuestionView; chapterName?: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-start gap-4 rounded-card bg-surface p-4 text-left ring-1 ring-line shadow-soft transition-[box-shadow] duration-150 hover:shadow-lift hover:ring-line-strong sm:p-5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
          <span className="font-medium text-ink">{q.title}</span>
          {chapterName && <span className="hidden sm:inline">· {chapterName}</span>}
        </div>
        <p className="mt-1.5 line-clamp-2 text-[15px] leading-relaxed text-ink">{q.text}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {q.maxMarks !== null && <Badge tone="neutral">{q.maxMarks} marks</Badge>}
          <SupportBadge support={q.support} />
          {q.source && <SourceBadge source={q.source} />}
        </div>
      </div>
      <Icon name="chevron" className="mt-1 size-5 text-muted transition-colors group-hover:text-brand" />
    </button>
  );
}

/* ------------------------------ Workspace bits ----------------------------- */

export type Crumb = { label: string; onClick?: () => void };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px]">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <Icon name="chevron" className="size-3.5 text-muted/70" />}
            {c.onClick ? (
              <button type="button" onClick={c.onClick} className="rounded text-muted underline-offset-2 transition-colors hover:text-ink hover:underline">
                {c.label}
              </button>
            ) : (
              <span aria-current="page" className="font-medium text-ink">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

const HOW_TO = [
  "Write in your own words, the way you would in the exam.",
  "Use short paragraphs or numbered points, one idea at a time.",
  "Refer to the relevant standard, section or provision where it applies.",
  "Cover every part of the question. Length alone earns nothing.",
];

/** The selected question with its marks, rubric status and answering tips. */
export function QuestionCard({ q, subjectName }: { q: QuestionView; subjectName: string }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand">{subjectName}</Badge>
        {q.maxMarks !== null && <Badge tone="neutral">{q.maxMarks} marks</Badge>}
        <SupportBadge support={q.support} />
        {q.source && <SourceBadge source={q.source} />}
      </div>
      <p className="mt-4 text-[13px] font-medium text-muted">{q.title}</p>
      <h2 className="mt-1 font-sans text-[18px] font-medium leading-relaxed tracking-normal sm:text-[19px]">{q.text}</h2>

      <details className="group mt-5 rounded-control bg-canvas ring-1 ring-inset ring-line">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-control px-4 py-2.5 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
          <Icon name="chevron" className="text-muted transition-transform group-open:rotate-90" /> How to answer
        </summary>
        <ul className="space-y-1.5 px-4 pb-3.5 pl-10 text-sm text-muted">
          {HOW_TO.map((t) => (
            <li key={t} className="list-disc">
              {t}
            </li>
          ))}
        </ul>
      </details>
    </Card>
  );
}
