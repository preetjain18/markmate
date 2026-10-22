import Link from "next/link";
import { MobileMenu, type NavItem } from "./site-nav";
import { ButtonLink, Icon, Logo, NavLink } from "./ui";

type Page = "home" | "practice" | "progress";

const navItems = (active?: Page): NavItem[] => [
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/#features", label: "Features" },
  { href: "/practice", label: "Practice", active: active === "practice" },
  { href: "/progress", label: "Progress", active: active === "progress" },
];

export function SiteHeader({ active }: { active?: Page }) {
  const items = navItems(active);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="MarkMate home" className="rounded-control">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {items.map((it) => (
            <NavLink key={it.href} href={it.href} active={it.active}>
              {it.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ButtonLink href="/practice" size="sm">
            Start Practising <Icon name="arrow" />
          </ButtonLink>
          <MobileMenu items={items} />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Logo />
            <p className="mt-2 max-w-sm text-sm text-muted">Answer-writing practice for CA students.</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="/" className="text-muted transition-colors hover:text-ink">
              Home
            </Link>
            <Link href="/#how-it-works" className="text-muted transition-colors hover:text-ink">
              How It Works
            </Link>
            <Link href="/#features" className="text-muted transition-colors hover:text-ink">
              Features
            </Link>
            <Link href="/practice" className="text-muted transition-colors hover:text-ink">
              Practice
            </Link>
            <Link href="/progress" className="text-muted transition-colors hover:text-ink">
              Progress
            </Link>
          </nav>
        </div>
        <p className="mt-8 border-t border-line pt-6 text-[13px] text-muted">
          Marks shown in MarkMate are practice estimates, not ICAI marks. Marking schemes are unverified drafts, not ICAI text.
        </p>
      </div>
    </footer>
  );
}
