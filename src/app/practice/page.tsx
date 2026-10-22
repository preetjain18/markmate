import type { Metadata } from "next";
import Link from "next/link";
import PracticeApp from "@/components/practice/PracticeApp";
import { SiteFooter, SiteHeader } from "@/components/site";
import { Badge, Icon } from "@/components/ui";
import { loadRubrics } from "@/lib/rubrics";

export const metadata: Metadata = { title: "Practice · MarkMate" };
export const dynamic = "force-static";

export default function PracticePage() {
  const questions = loadRubrics().map((r) => ({
    id: r.id,
    sa: r.sa,
    topic: r.topic,
    question: r.question,
    maxMarks: r.maxMarks,
    verified: r.verified,
  }));
  return (
    <>
      <SiteHeader active="practice" />
      <main>
        <div className="border-b border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            <Link href="/" className="inline-flex items-center gap-1.5 rounded-control text-sm text-muted transition-colors hover:text-ink">
              <Icon name="back" /> Back to home
            </Link>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-[2rem] font-bold leading-tight sm:text-[2.5rem]">Practice</h1>
                <p className="mt-1 text-[17px] text-muted">Build your answer-writing skills, one question at a time.</p>
              </div>
              <Badge tone="brand" className="self-start px-3 py-1 text-sm sm:self-auto">
                CA Final · Audit
              </Badge>
            </div>
          </div>
        </div>
        <PracticeApp questions={questions} />
      </main>
      <SiteFooter />
    </>
  );
}
