import type { Metadata } from "next";
import ScanWizard from "@/components/scan/ScanWizard";
import { SiteFooter, SiteHeader } from "@/components/site";
import { loadCatalog } from "@/lib/catalog";

export const metadata: Metadata = { title: "Scan My Answer · MarkMate" };
export const dynamic = "force-static";

export default function ScanPage() {
  const catalog = loadCatalog().view;
  return (
    <>
      <SiteHeader active="scan" />
      <main>
        <div className="border-b border-line bg-surface">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
            <h1 className="text-[2rem] font-bold leading-tight sm:text-[2.5rem]">Scan My Answer</h1>
            <p className="mt-1 max-w-2xl text-[17px] text-muted">Write on paper like the real exam. Upload it, check what we read, and see exactly where the marks went.</p>
          </div>
        </div>
        <div className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6">
          <ScanWizard catalog={catalog} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
