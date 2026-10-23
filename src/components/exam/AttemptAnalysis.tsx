"use client";

/**
 * Attempt Analysis: published ICAI pass rates per attempt, ICAI chapter weightage per paper, and the
 * student's own scores per paper (from this browser's practice history). No figure here is estimated:
 * the first two come from data/exam-insights.json with a source link each, the third from saved attempts.
 */
import { useEffect, useMemo, useState } from "react";
import type { CatalogView } from "@/lib/catalog-types";
import { analyseAttempts, headlineRates, LEVELS, rankChapters, type ExamInsights, type ExamLevel } from "@/lib/exam";
import { loadHistory, type HistoryRecord } from "@/lib/history";
import { bySubject, MIN_FOR_JUDGEMENT, practiceHref } from "@/lib/progress";
import { cn, fmt } from "@/lib/ui";
import { Badge, ButtonLink, Card, EmptyState, Icon } from "../ui";

const LEVEL_NAME: Record<ExamLevel, string> = { foundation: "Foundation", intermediate: "Intermediate", final: "Final" };
const GROUP_NAME = { overall: "Overall", both: "Both groups", group1: "Group I", group2: "Group II" } as const;

export default function AttemptAnalysis({ insights, catalog }: { insights: ExamInsights; catalog: CatalogView }) {
  const [level, setLevel] = useState<ExamLevel>("intermediate");
  const [history, setHistory] = useState<HistoryRecord[] | null>(null);
  useEffect(() => setHistory(loadHistory()), []);

  const attempts = useMemo(() => analyseAttempts(headlineRates(insights.passRates, level)), [insights.passRates, level]);
  const papers = insights.weightage.filter((p) => p.level === level);
  const [paperIdx, setPaperIdx] = useState(0);
  useEffect(() => setPaperIdx(0), [level]);
  const paper = papers[paperIdx] ?? null;

  return (
    <div className="space-y-8">
      <div role="group" aria-label="CA level" className="grid grid-cols-3 gap-1 rounded-card bg-subtle p-1 sm:inline-grid sm:min-w-[30rem]">
        {LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={l === level}
            onClick={() => setLevel(l)}
            className={cn(
              "rounded-control px-2 py-2.5 font-display text-[15px] font-semibold transition-colors",
              l === level ? "bg-brand text-white shadow-soft" : "text-muted hover:bg-surface hover:text-ink",
            )}
          >
            {LEVEL_NAME[l]}
          </button>
        ))}
      </div>

      {/* 1. Attempts */}
      <Card className="p-5 sm:p-7">
        <h2 className="text-[1.375rem] font-bold">Which attempts were tougher</h2>
        <p className="mt-1 max-w-3xl text-[15px] text-muted">
          ICAI&apos;s published pass rate for each CA {LEVEL_NAME[level]} attempt. A lower pass rate means fewer candidates cleared that attempt; it
          reflects how candidates did, not only how hard the papers were.
        </p>
        {attempts.rows.length === 0 ? (
          <EmptyState icon="inbox" title="No published pass rates found for this level yet" description="We only show figures we could trace to a source." />
        ) : (
          <>
            {attempts.hardest && attempts.easiest && (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Stat label="Lowest pass rate" value={`${fmt(attempts.hardest.passPercent)}%`} note={attempts.hardest.attempt} tone="text-error" />
                <Stat label="Highest pass rate" value={`${fmt(attempts.easiest.passPercent)}%`} note={attempts.easiest.attempt} tone="text-success" />
                <Stat label="Average of these attempts" value={`${fmt(Math.round(attempts.average! * 100) / 100)}%`} note={`${attempts.rows.length} attempts`} />
              </div>
            )}
            <ul className="mt-6 space-y-3" aria-label="Pass rate by attempt">
              {attempts.rows.map((r) => (
                <li key={r.attempt} className="grid grid-cols-[9rem_1fr] items-center gap-3 sm:grid-cols-[10rem_1fr_13rem]">
                  <span className="font-medium text-ink">{r.attempt}</span>
                  <div className="h-3 overflow-hidden rounded-full bg-subtle" aria-hidden>
                    <div className={cn("h-full rounded-full", r.band === "lower" ? "bg-error" : r.band === "higher" ? "bg-success" : "bg-brand")} style={{ width: `${Math.min(100, (r.passPercent / Math.max(...attempts.rows.map((x) => x.passPercent))) * 100)}%` }} />
                  </div>
                  <span className="col-span-2 flex flex-wrap items-center gap-2 text-[14px] sm:col-span-1">
                    <b className="tabular-nums">{fmt(r.passPercent)}%</b>
                    <Badge tone={r.band === "lower" ? "error" : r.band === "higher" ? "success" : "neutral"}>
                      {r.band === "lower" ? "Tougher" : r.band === "higher" ? "Easier" : "Typical"}
                    </Badge>
                    <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="text-[12px] text-muted underline underline-offset-2 hover:text-ink">
                      Source{r.sourceType === "icai" ? " (ICAI)" : ""}
                    </a>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[13px] text-muted">
              {level === "foundation" ? "Overall pass rate." : "Pass rate for candidates who appeared in both groups, where published; otherwise the group shown."}{" "}
              &ldquo;Tougher&rdquo; and &ldquo;Easier&rdquo; mean more than 2 points below or above the average of the attempts listed.
              {attempts.rows.some((r) => r.group !== "both" && r.group !== "overall") && ` Some rows use ${[...new Set(attempts.rows.filter((r) => r.group === "group1" || r.group === "group2").map((r) => GROUP_NAME[r.group]))].join(" / ")} figures.`}
            </p>
          </>
        )}
      </Card>

      {/* 2. Chapter weightage */}
      <Card className="p-5 sm:p-7">
        <h2 className="text-[1.375rem] font-bold">Which chapters carry the most marks</h2>
        <p className="mt-1 max-w-3xl text-[15px] text-muted">ICAI&apos;s published marks weightage for each section of the paper. Start with the sections marked &ldquo;Focus first&rdquo;.</p>
        {papers.length === 0 ? (
          <EmptyState icon="inbox" title="No published weightage found for this level yet" description="We only show weightage we could trace to a source." />
        ) : (
          <>
            <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Paper">
              {papers.map((p, i) => (
                <button
                  key={p.paper}
                  type="button"
                  aria-pressed={i === paperIdx}
                  onClick={() => setPaperIdx(i)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-[14px] font-medium ring-1 ring-inset transition-colors",
                    i === paperIdx ? "bg-brand text-white ring-brand" : "bg-surface text-ink ring-line-strong hover:bg-canvas",
                  )}
                >
                  {p.paper}
                </button>
              ))}
            </div>
            {paper && <Weightage paper={paper} catalog={catalog} level={level} />}
          </>
        )}
      </Card>

      {/* 3. Personal */}
      <Card className="p-5 sm:p-7">
        <h2 className="text-[1.375rem] font-bold">Where you score</h2>
        <p className="mt-1 max-w-3xl text-[15px] text-muted">From your own marked answers in MarkMate (saved in this browser), first attempts only.</p>
        <YourScores history={history} catalog={catalog} level={level} />
      </Card>

      <p className="text-[13px] text-muted">Figures checked on {insights.asOf}. ICAI may revise weightage when the syllabus changes; always check icai.org for your attempt.</p>
    </div>
  );
}

function Stat({ label, value, note, tone }: { label: string; value: string; note: string; tone?: string }) {
  return (
    <div className="rounded-card bg-canvas p-4 ring-1 ring-inset ring-line">
      <p className="text-[13px] text-muted">{label}</p>
      <p className={cn("font-display text-3xl font-bold tabular-nums", tone ?? "text-ink")}>{value}</p>
      <p className="text-[13px] font-medium text-ink">{note}</p>
    </div>
  );
}

function Weightage({ paper, catalog, level }: { paper: ExamInsights["weightage"][number]; catalog: CatalogView; level: ExamLevel }) {
  const groups = rankChapters(paper);
  const subject = catalog.levels.flatMap((l) => l.subjects).find((s) => s.id === paper.subjectId);
  const unit = paper.unit === "percent" ? "%" : " marks";
  return (
    <div className="mt-5 space-y-6">
      {groups.map((g) => {
        const top = Math.max(...g.items.map((r) => r.max), 1);
        return (
          <div key={g.part ?? "all"}>
            {g.part && <h3 className="mb-2.5 font-display text-[16px] font-semibold text-ink">{g.part}</h3>}
            <ul className="space-y-3" aria-label={`${paper.paper}${g.part ? `, ${g.part}` : ""} weightage`}>
              {g.items.map((it) => (
                <li key={it.name} className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_14rem] sm:items-center sm:gap-4">
                  <span className="flex flex-col items-start gap-1 text-[15px] leading-snug text-ink sm:flex-row sm:gap-2">
                    {it.focus && <Badge tone="brand" className="shrink-0">Focus first</Badge>}
                    <span>{it.name}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-subtle" aria-hidden>
                      <span className="absolute inset-y-0 rounded-full bg-brand/25" style={{ left: 0, width: `${(it.max / top) * 100}%` }} />
                      <span className="absolute inset-y-0 rounded-full bg-brand" style={{ left: 0, width: `${(it.min / top) * 100}%` }} />
                    </span>
                    <span className="w-24 shrink-0 text-right text-[14px] font-semibold tabular-nums">{it.text || `${it.min}–${it.max}${unit}`}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <p className="text-[13px] text-muted">
        ICAI publishes weightage by section, so one row can cover several chapters. Actual papers may vary by about 5% either way.
        {groups.some((g) => g.part) && " Percentages are of each part of the paper."}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <a href={paper.sourceUrl} target="_blank" rel="noreferrer" className="text-[13px] text-muted underline underline-offset-2 hover:text-ink">
          Source: {paper.sourceTitle || (paper.sourceType === "icai" ? "ICAI" : "published table")}
        </a>
        {subject && (
          <ButtonLink href={practiceHref({ level, subject: subject.id })} size="sm" variant="secondary">
            Practise {subject.short ?? subject.name} <Icon name="arrow" />
          </ButtonLink>
        )}
      </div>
    </div>
  );
}

function YourScores({ history, catalog, level }: { history: HistoryRecord[] | null; catalog: CatalogView; level: ExamLevel }) {
  if (!history) return <p className="mt-4 text-[14px] text-muted">Reading your practice history…</p>;
  const lv = catalog.levels.find((l) => l.id === level);
  const practised = bySubject(history, catalog).practised.filter((p) => p.level.id === level);
  if (!lv || practised.length === 0)
    return (
      <EmptyState
        icon="target"
        title={`No marked answers for CA ${LEVEL_NAME[level]} yet`}
        description="Answer a few questions and this shows which papers you score well in and which need work."
        action={
          <ButtonLink href={practiceHref({ level })} size="sm">
            Start practising <Icon name="arrow" />
          </ButtonLink>
        }
      />
    );
  const sorted = [...practised].sort((a, b) => (b.averagePct ?? 0) - (a.averagePct ?? 0));
  return (
    <ul className="mt-5 divide-y divide-line">
      {sorted.map((p) => {
        const enough = p.questionsEvaluated >= MIN_FOR_JUDGEMENT;
        const avg = p.averagePct ?? 0;
        return (
          <li key={p.subject.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <span className="min-w-0">
              <span className="block font-medium text-ink">{p.subject.short ?? p.subject.name}</span>
              <span className="text-[13px] text-muted">
                {p.questionsEvaluated} question{p.questionsEvaluated === 1 ? "" : "s"} marked
              </span>
            </span>
            <span className="flex items-center gap-2">
              <b className="tabular-nums">{Math.round(avg)}%</b>
              {enough ? (
                <Badge tone={avg >= 60 ? "success" : avg < 40 ? "error" : "attention"}>{avg >= 60 ? "Scoring for you" : avg < 40 ? "Needs work" : "Getting there"}</Badge>
              ) : (
                <Badge tone="neutral">Answer {MIN_FOR_JUDGEMENT - p.questionsEvaluated} more to judge</Badge>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
