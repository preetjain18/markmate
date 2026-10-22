import type { Metadata } from "next";
import PracticeApp from "@/components/practice/PracticeApp";
import { SiteFooter, SiteHeader } from "@/components/site";
import { loadRubrics } from "@/lib/rubrics";

export const metadata: Metadata = { title: "Practise · MarkMate" };
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
        <PracticeApp questions={questions} />
      </main>
      <SiteFooter />
    </>
  );
}
