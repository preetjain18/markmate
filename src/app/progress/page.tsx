import type { Metadata } from "next";
import Dashboard from "@/components/progress/Dashboard";
import { SiteFooter, SiteHeader } from "@/components/site";
import { loadCatalog } from "@/lib/catalog";

export const metadata: Metadata = { title: "Your Progress · MarkMate" };
export const dynamic = "force-static";

export default function ProgressPage() {
  const catalog = loadCatalog().view;
  return (
    <>
      <SiteHeader active="progress" />
      <main>
        <div className="border-b border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            <h1 className="text-[2rem] font-bold leading-tight sm:text-[2.5rem]">Your Progress</h1>
            <p className="mt-1 max-w-2xl text-[17px] text-muted">See where you&apos;re improving, find your weak areas, and plan your next practice session.</p>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
          <Dashboard catalog={catalog} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
