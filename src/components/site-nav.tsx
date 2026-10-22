"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/ui";
import { ButtonLink, Icon } from "./ui";

export type NavItem = { href: string; label: string; active?: boolean };

/** Compact menu for small screens: a toggle button and a drop-down panel of links. */
export function MobileMenu({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        className="grid size-10 place-items-center rounded-control text-ink transition-colors hover:bg-subtle"
      >
        <Icon name={open ? "x" : "menu"} className="size-5" />
      </button>
      <div
        id="mobile-menu"
        hidden={!open}
        className="absolute inset-x-0 top-16 border-b border-line bg-canvas px-4 pb-5 pt-2 shadow-lift"
      >
        <nav aria-label="Mobile" className="flex flex-col">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              onClick={() => setOpen(false)}
              aria-current={it.active ? "page" : undefined}
              className={cn(
                "rounded-control px-3 py-3 font-display text-base font-medium transition-colors",
                it.active ? "bg-mint text-brand" : "text-ink hover:bg-subtle",
              )}
            >
              {it.label}
            </Link>
          ))}
        </nav>
        <ButtonLink href="/scan" className="mt-3 w-full">
          <Icon name="camera" /> Scan My Answer
        </ButtonLink>
      </div>
    </div>
  );
}
