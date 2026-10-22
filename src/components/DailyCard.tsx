"use client";

/** Question of the Day with the student's practice streak (from history saved in this browser). */
import Link from "next/link";
import { useEffect, useState } from "react";
import type { QuestionView } from "@/lib/catalog-types";
import { dateKey, didQuestionToday, practiceStreak, questionOfDay, type Streak } from "@/lib/daily";
import { loadHistory } from "@/lib/history";
import { practiceHref } from "@/lib/progress";
import { cn } from "@/lib/ui";
import { Badge, ButtonLink, Card, Icon } from "./ui";

export type DailyContext = { questions: QuestionView[]; names: Record<string, string> };

export function DailyCard({ questions, names, compact }: DailyContext & { compact?: boolean }) {
  // Everything here depends on the student's date and browser storage, so it renders after mount.
  const [state, setState] = useState<{ q: QuestionView; streak: Streak; done: boolean; day: Date } | null>(null);
  useEffect(() => {
    const now = new Date();
    let level: string | null = null;
    try {
      level = localStorage.getItem("markmate-level");
    } catch {}
    const q = questionOfDay(questions, dateKey(now), level);
    if (!q) return;
    const history = loadHistory();
    setState({ q, streak: practiceStreak(history, now), done: didQuestionToday(history, q.id, now), day: now });
  }, [questions]);

  if (!state) return <Card className={cn("animate-pulse", compact ? "h-28" : "h-40")}>{null}</Card>;
  const { q, streak, done, day } = state;
  const href = practiceHref({ level: q.levelId, subject: q.subjectId, chapter: q.chapterId, topic: q.topicId ?? undefined, question: q.id });

  return (
    <Card className="overflow-hidden">
      <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-center", compact ? "p-4 sm:p-5" : "p-5 sm:p-6")}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">
              <Icon name="calendar" className="size-3.5" /> Question of the day
            </Badge>
            <span className="text-[13px] text-muted">{day.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>
          <p className="mt-2 text-[13px] text-muted">
            {names[q.levelId]} · {names[q.subjectId]} · {q.maxMarks} marks
          </p>
          <Link href={href} className="mt-1 block rounded text-[16px] font-medium leading-snug text-ink hover:text-brand sm:text-[17px]">
            <span className={cn(compact && "line-clamp-2")}>{q.text}</span>
          </Link>
        </div>
        <div className="flex shrink-0 flex-row items-center gap-4 sm:flex-col sm:items-end sm:gap-3">
          <p className={cn("flex items-center gap-1.5 text-sm font-medium", streak.days ? "text-warning" : "text-muted")}>
            <Icon name="flame" className={cn("size-5", streak.days ? "text-accent" : "text-muted")} />
            {streak.days ? `${streak.days}-day streak` : "Start a streak today"}
          </p>
          {done ? (
            <Badge tone="success">
              <Icon name="check" className="size-3.5" /> Done today
            </Badge>
          ) : (
            <ButtonLink href={href} size="sm">
              {streak.days && !streak.practisedToday ? "Keep your streak" : "Answer today's question"} <Icon name="arrow" />
            </ButtonLink>
          )}
        </div>
      </div>
    </Card>
  );
}
