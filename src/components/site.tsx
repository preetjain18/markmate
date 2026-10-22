import Link from "next/link";
import { ButtonLink, Icon, Logo } from "./ui";

export function SiteHeader({ active }: { active?: "home" | "practice" }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-canvas/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="MarkMate home">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {active !== "practice" && (
            <>
              <a href="/#how" className="hidden rounded-lg px-3 py-2 text-slate-600 transition hover:text-ink sm:block">
                How it works
              </a>
              <a href="/#map" className="hidden rounded-lg px-3 py-2 text-slate-600 transition hover:text-ink sm:block">
                Lost Marks Map
              </a>
              <a href="/#trust" className="hidden rounded-lg px-3 py-2 text-slate-600 transition hover:text-ink md:block">
                How we mark
              </a>
            </>
          )}
          {active === "practice" ? (
            <ButtonLink href="/" variant="ghost" size="sm">
              Home
            </ButtonLink>
          ) : (
            <ButtonLink href="/practice" size="sm" className="ml-2">
              Start practising <Icon name="arrow" className="size-3.5" />
            </ButtonLink>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Logo className="text-sm" />
        <p>Practice marks, not ICAI marks. Marking schemes are unverified drafts, not ICAI text.</p>
      </div>
    </footer>
  );
}
