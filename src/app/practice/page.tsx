import type { Metadata } from "next";
import Link from "next/link";
import PracticeApp from "@/components/practice/PracticeApp";
import { SiteFooter, SiteHeader } from "@/components/site";
import { Icon } from "@/components/ui";
import { loadCatalog } from "@/lib/catalog";

export const metadata: Metadata = { title: "Practice · MarkMate" };
export const dynamic = "force-static";

export default function PracticePage() {
  const catalog = loadCatalog().view;
  return (
    <>
      <SiteHeader active="practice" />
      <main>
        <div className="border-b border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            <Link href="/" className="inline-flex items-center gap-1.5 rounded-control text-sm text-muted transition-colors hover:text-ink">
              <Icon name="back" /> Back to home
            </Link>
            <h1 className="mt-4 text-[2rem] font-bold leading-tight sm:text-[2.5rem]">Practice</h1>
            <p className="mt-1 text-[17px] text-muted">Build your answer-writing skills, one question at a time.</p>
          </div>
        </div>
        <PracticeApp catalog={catalog} />
      </main>
      <SiteFooter />
    </>
  );
}
