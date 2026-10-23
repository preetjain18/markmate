import type { Metadata } from "next";
import AttemptAnalysis from "@/components/exam/AttemptAnalysis";
import { SiteFooter, SiteHeader } from "@/components/site";
import { loadCatalog } from "@/lib/catalog";
import { loadExamInsights } from "@/lib/exam-data";

export const metadata: Metadata = { title: "Attempt Analysis · MarkMate" };
export const dynamic = "force-static";

export default function AttemptsPage() {
  const catalog = loadCatalog().view;
  const insights = loadExamInsights();
  return (
    <>
      <SiteHeader active="attempts" />
      <main>
        <div className="border-b border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            <h1 className="text-[2rem] font-bold leading-tight sm:text-[2.5rem]">Attempt Analysis</h1>
            <p className="mt-1 max-w-2xl text-[17px] text-muted">
              Which CA attempts had lower or higher pass rates, which chapters carry the most marks, and where you score best. Every figure links to its source.
            </p>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
          <AttemptAnalysis insights={insights} catalog={catalog} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
