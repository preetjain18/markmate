"use client";

/**
 * "Your Progress": reads the practice history kept in this browser and shows only what it supports.
 * All numbers come from src/lib/progress.ts over recorded, validated evaluations.
 */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CatalogView } from "@/lib/catalog-types";
import { clearHistory, loadHistory, type HistoryRecord } from "@/lib/history";
import { byChapter, bySubject, MIN_FOR_JUDGEMENT, MIN_FOR_TREND, practiceHref, recommend, summarize, trend, type Recommendation, type TrendPoint } from "@/lib/progress";
import { cn } from "@/lib/ui";
import { Badge, Button, ButtonLink, Card, EmptyState, Icon, LoadingState, SectionHeading, type IconName } from "../ui";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const pctText = (p: number | null) => (p === null ? "—" : `${Math.round(p)}%`);

export default function Dashboard({ catalog }: { catalog: CatalogView }) {
  const [history, setHistory] = useState<HistoryRecord[] | null>(null);
  useEffect(() => setHistory(loadHistory()), []);

  const model = useMemo(() => {
    if (!history) return null;
    return {
      summary: summarize(history),
      subjects: bySubject(history, catalog),
      trend: trend(history),
      recs: recommend(history, catalog),
      customCount: history.filter((r) => r.questionId === null).length,
    };
  }, [history, catalog]);

  if (!history || !model) return <LoadingState message="Reading your practice history…" rows={2} />;

  const { summary, subjects, recs } = model;

  if (history.length === 0) {
    const first = recs[0];
    return (
      <div className="space-y-6">
        <EmptyState
          icon="graduation"
          title="No practice recorded yet"
          description="Evaluate your first answer and your progress will start appearing here: scores, weak areas and what to practise next."
          action={
            <ButtonLink href={first ? practiceHref(first.link) : "/practice"}>
              Practise your first question <Icon name="arrow" />
            </ButtonLink>
          }
        />
        <StorageNote onClear={null} />
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* 1. Overview */}
      <section aria-labelledby="overview-h">
        <h2 id="overview-h" className="sr-only">
          Overview
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Questions attempted" value={String(summary.questionsAttempted)} />
          <Metric
            label="Completed evaluations"
            value={String(summary.evaluations)}
            note={summary.failed ? `${summary.failed} more didn't complete` : "None failed"}
          />
          <Metric
            label="Average first-attempt score"
            value={pctText(summary.averageFirstAttemptPct)}
            note={summary.firstAttempts ? `Across ${summary.firstAttempts} first attempt${summary.firstAttempts === 1 ? "" : "s"}` : "No completed first attempts"}
          />
          <Metric
            label="Marking points improved by rewriting"
            value={summary.pointsImproved === null ? "—" : String(summary.pointsImproved)}
            note={summary.pointsImproved === null ? "Rewrite an answer to see this" : "Latest rewrite of each answer"}
          />
        </div>
        <p className="mt-3 text-[13px] text-muted">
          Scores are practice estimates as a percentage of each question&apos;s marks, not ICAI marks.
          {summary.ruleBasedEvaluations > 0 &&
            ` ${summary.ruleBasedEvaluations} of ${summary.evaluations} evaluations were marked by the rule-based fallback because the AI wasn't available.`}
          {model.customCount > 0 && ` Includes ${model.customCount} attempt${model.customCount === 1 ? "" : "s"} on your own questions, which aren't grouped by subject.`}
        </p>
      </section>

      {/* 5. What to practise next (first, because it's the most actionable) */}
      <section aria-labelledby="next-h">
        <SectionHeading eyebrow="Recommended" title="What to Practise Next" />
        <p className="mt-2 text-sm text-muted">Simple rules on your history: weak answers not yet rewritten, repeated gaps, then chapters you haven&apos;t tried.</p>
        {recs.length ? (
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {recs.map((r, i) => (
              <li key={i}>
                <RecCard r={r} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 text-sm text-ink">You&apos;ve tried every available question. Rewriting your lowest-scoring answers is the best next step.</p>
        )}
      </section>

      {/* 2. Subjects */}
      <section aria-labelledby="subjects-h">
        <SectionHeading title="Performance by Subject" />
        <div className="mt-5 space-y-3">
          {subjects.practised.map((s) => (
            <Card key={s.subject.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-muted">
                  {s.level.name}
                  {s.subject.paper && ` · ${s.subject.paper}`}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[17px] font-semibold">{s.subject.name}</h3>
                  {s.tag === "strongest" && <Badge tone="success">Strongest</Badge>}
                  {s.tag === "weakest" && <Badge tone="attention">Needs most work</Badge>}
                </div>
                <p className="mt-1 text-[13px] text-muted">
                  {s.questionsEvaluated} question{s.questionsEvaluated === 1 ? "" : "s"} evaluated · {s.evaluations} evaluation{s.evaluations === 1 ? "" : "s"} in total
                  {s.questionsEvaluated < MIN_FOR_JUDGEMENT && " · limited data"}
                </p>
                <ScoreBar pct={s.averagePct} label="Average first-attempt score" />
              </div>
              <ButtonLink href={practiceHref({ level: s.level.id, subject: s.subject.id })} variant="secondary" size="sm" className="self-start sm:self-center">
                Practise {s.subject.short ?? "this subject"}
              </ButtonLink>
            </Card>
          ))}
          {subjects.practised.length < 2 && subjects.practised.length > 0 && (
            <p className="text-[13px] text-muted">Strongest and weakest subjects appear once you&apos;ve evaluated at least {MIN_FOR_JUDGEMENT} questions in two subjects.</p>
          )}
          {subjects.notPractised.length > 0 && (
            <div className="pt-2">
              <p className="text-sm font-medium">Not practised yet</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {subjects.notPractised.map(({ subject, level }) => (
                  <Link
                    key={subject.id}
                    href={practiceHref({ level: level.id, subject: subject.id })}
                    className="rounded-full bg-surface px-3 py-1.5 text-[13px] text-ink ring-1 ring-line transition-colors hover:ring-line-strong"
                  >
                    {level.name} · {subject.short ?? subject.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
          <p className="text-[13px] text-muted">Subjects without evaluation-ready questions aren&apos;t listed. Having no score isn&apos;t the same as scoring zero.</p>
        </div>
      </section>

      {/* 3. Chapters */}
      <section aria-labelledby="chapters-h">
        <SectionHeading title="Your Chapter Insights" />
        {subjects.practised.filter((s) => s.subject.chapters.length).length === 0 ? (
          <p className="mt-4 text-sm text-muted">Chapter insights appear once you evaluate a question from a subject with chapters.</p>
        ) : (
          subjects.practised
            .filter((s) => s.subject.chapters.length)
            .map((s) => <ChapterTable key={s.subject.id} history={history} level={s.level.id} subject={s.subject} />)
        )}
      </section>

      {/* 4. Over time */}
      <section aria-labelledby="trend-h">
        <SectionHeading title="Improvement Over Time" />
        <p className="mt-2 text-sm text-muted">Each dot is one completed evaluation, as a percentage of that question&apos;s marks, in the order you did them.</p>
        {model.trend.enough ? (
          <TrendChart points={model.trend.points} />
        ) : (
          <Card className="mt-5 p-5 text-sm text-ink">
            A trend appears after {MIN_FOR_TREND} completed evaluations, so a single result isn&apos;t mistaken for a pattern. You have {model.trend.points.length} so far.
          </Card>
        )}
      </section>

      <StorageNote
        onClear={() => {
          if (window.confirm("Clear all practice history saved in this browser? This can't be undone.")) {
            clearHistory();
            setHistory([]);
          }
        }}
      />
    </div>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card className="p-4 sm:p-5">
      <p className="text-[13px] text-muted">{label}</p>
      <p className="mt-1 font-display text-[1.75rem] font-bold tabular-nums">{value}</p>
      {note && <p className="mt-0.5 text-[12px] text-muted">{note}</p>}
    </Card>
  );
}

function ScoreBar({ pct, label }: { pct: number | null; label: string }) {
  if (pct === null) return null;
  return (
    <div className="mt-3 flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-subtle" role="img" aria-label={`${label}: ${Math.round(pct)}%`}>
        <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
      <span className="w-24 text-right text-[13px] tabular-nums text-ink">{Math.round(pct)}% avg</span>
    </div>
  );
}

const REC_ICON: Record<Recommendation["kind"], IconName> = {
  rewrite: "refresh",
  "repeated-gap": "target",
  "partial-topic": "partial",
  unpractised: "folder",
  first: "notebook",
};

function RecCard({ r }: { r: Recommendation }) {
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-control bg-mint text-brand">
          <Icon name={REC_ICON[r.kind]} />
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold leading-snug">{r.title}</h3>
          <p className="mt-1 text-[14px] leading-relaxed text-muted">{r.why}</p>
        </div>
      </div>
      <ButtonLink href={practiceHref(r.link)} size="sm" className="mt-4 self-start">
        {r.action} <Icon name="arrow" />
      </ButtonLink>
    </Card>
  );
}

function ChapterTable({ history, level, subject }: { history: HistoryRecord[]; level: string; subject: Parameters<typeof byChapter>[1] }) {
  const rows = byChapter(history, subject);
  return (
    <Card className="mt-5 overflow-hidden">
      <div className="border-b border-line px-5 py-3.5">
        <h3 className="text-[15px] font-semibold">{subject.name}</h3>
        {subject.chapterNote && <p className="text-[12px] text-muted">{subject.chapterNote}</p>}
      </div>
      <ul className="divide-y divide-line">
        {rows.map((c) => (
          <li key={c.chapter.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-ink">
                {c.chapter.name}
                {c.chapter.note && <span className="font-normal text-muted"> · {c.chapter.note}</span>}
              </p>
              <p className="mt-0.5 text-[13px] text-muted">
                {c.questionsAvailable === 0
                  ? "No questions available yet"
                  : c.questionsEvaluated === 0
                    ? `Not practised yet · ${c.questionsAvailable} question${c.questionsAvailable === 1 ? "" : "s"} available`
                    : `${c.questionsEvaluated} of ${c.questionsAvailable} questions evaluated · average ${pctText(c.averagePct)}`}
                {c.questionsEvaluated > 0 && c.limited && " · limited data"}
              </p>
              {c.repeatedGaps.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {c.repeatedGaps.slice(0, 3).map((g) => (
                    <li key={g.label} className="flex items-start gap-1.5 text-[13px] text-ink">
                      <Icon name="target" className="mt-0.5 size-3.5 text-warning" /> Repeatedly missed: “{g.label}” ({g.times}×)
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {c.questionsAvailable > 0 && (
              <ButtonLink href={practiceHref({ level, subject: subject.id, chapter: c.chapter.id })} variant="ghost" size="sm" className="self-start">
                Practise chapter <Icon name="arrow" />
              </ButtonLink>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Single-series dot-and-line chart. Filled dots = Attempt 1, hollow = rewrites. Hover or focus a dot for details. */
function TrendChart({ points }: { points: TrendPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  // A wide drawing area keeps the chart compact and its labels small on large screens.
  const W = 1000;
  const H = 240;
  const pad = { l: 44, r: 16, t: 16, b: 30 };
  const x = (i: number) => pad.l + (points.length === 1 ? 0 : (i * (W - pad.l - pad.r)) / (points.length - 1));
  const y = (p: number) => pad.t + ((100 - p) * (H - pad.t - pad.b)) / 100;
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.pct)}`).join(" ");
  const h = hover !== null ? points[hover] : null;

  return (
    <Card className="mt-5 p-5">
      <div className="flex flex-wrap items-center gap-4 text-[13px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-brand" /> Attempt 1
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-surface ring-2 ring-inset ring-brand" /> Rewrite
        </span>
      </div>
      <div className="relative mt-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Practice scores over ${points.length} evaluations, from ${Math.round(points[0].pct)}% to ${Math.round(points[points.length - 1].pct)}%. Table view below.`}>
          {[0, 50, 100].map((g) => (
            <g key={g}>
              <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} stroke="var(--color-line)" strokeWidth={1} />
              <text x={pad.l - 8} y={y(g) + 4} textAnchor="end" fontSize="11" fill="var(--color-muted)">
                {g}%
              </text>
            </g>
          ))}
          <path d={path} fill="none" stroke="var(--color-brand)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => (
            <g
              key={p.id}
              tabIndex={0}
              role="img"
              aria-label={`${fmtDate(p.date)}, ${p.title}, Attempt ${p.attemptNo}: ${Math.round(p.pct)}%`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="cursor-default outline-none"
            >
              <circle cx={x(i)} cy={y(p.pct)} r={14} fill="transparent" />
              <circle
                cx={x(i)}
                cy={y(p.pct)}
                r={hover === i ? 6.5 : 5}
                fill={p.attemptNo === 1 ? "var(--color-brand)" : "var(--color-surface)"}
                stroke={p.attemptNo === 1 ? "var(--color-surface)" : "var(--color-brand)"}
                strokeWidth={2}
              />
            </g>
          ))}
          <text x={pad.l} y={H - 6} fontSize="11" fill="var(--color-muted)">
            {fmtDate(points[0].date)}
          </text>
          <text x={W - pad.r} y={H - 6} fontSize="11" textAnchor="end" fill="var(--color-muted)">
            {fmtDate(points[points.length - 1].date)}
          </text>
        </svg>
        {h && hover !== null && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-control bg-ink px-3 py-2 text-[12px] text-white shadow-lift"
            style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(h.pct) / H) * 100}%`, marginTop: -10 }}
          >
            <p className="font-semibold">{Math.round(h.pct)}%</p>
            <p className="text-white/80">{h.title}</p>
            <p className="text-white/80">
              Attempt {h.attemptNo} · {fmtDate(h.date)}
            </p>
          </div>
        )}
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-[13px] font-medium text-brand">View as table</summary>
        <table className="mt-2 w-full text-left text-[13px]">
          <thead className="text-muted">
            <tr>
              <th className="py-1 font-medium">Date</th>
              <th className="py-1 font-medium">Question</th>
              <th className="py-1 font-medium">Attempt</th>
              <th className="py-1 text-right font-medium">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {points.map((p) => (
              <tr key={p.id}>
                <td className="py-1.5 pr-2 whitespace-nowrap">{fmtDate(p.date)}</td>
                <td className="py-1.5 pr-2">{p.title}</td>
                <td className="py-1.5 pr-2">{p.attemptNo}</td>
                <td className="py-1.5 text-right tabular-nums">{Math.round(p.pct)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </Card>
  );
}

function StorageNote({ onClear }: { onClear: (() => void) | null }) {
  return (
    <Card className={cn("flex flex-col gap-3 p-5 sm:flex-row sm:items-center")}>
      <Icon name="info" className="size-5 text-muted" />
      <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-muted">
        Your progress is saved only in this browser on this device. It isn&apos;t linked to an account and isn&apos;t sent anywhere. Clearing your browser
        data, using a private window or switching device starts a new history.
      </p>
      {onClear && (
        <Button variant="ghost" size="sm" onClick={onClear} className="self-start sm:self-center">
          Clear history
        </Button>
      )}
    </Card>
  );
}
