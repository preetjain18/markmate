import Link from "next/link";
import { cn } from "@/lib/ui";

type BtnProps = {
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "lg" | "sm";
  className?: string;
  children: React.ReactNode;
};

const btn = (variant: BtnProps["variant"] = "primary", size: BtnProps["size"] = "md") =>
  cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:pointer-events-none disabled:opacity-50",
    size === "lg" && "h-12 px-6 text-[15px]",
    size === "md" && "h-10 px-4 text-sm",
    size === "sm" && "h-8 px-3 text-[13px]",
    variant === "primary" &&
      "bg-ink text-white shadow-[0_1px_0_rgb(255_255_255/0.15)_inset,0_8px_20px_-8px_rgb(11_16_32/0.6)] hover:-translate-y-px hover:bg-slate-800",
    variant === "secondary" && "bg-white text-ink ring-1 ring-slate-200 shadow-soft hover:bg-slate-50 hover:ring-slate-300",
    variant === "ghost" && "text-slate-600 hover:bg-slate-100 hover:text-ink",
  );

export function Button({
  variant,
  size,
  className,
  children,
  ...rest
}: BtnProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(btn(variant, size), className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({ href, variant, size, className, children }: BtnProps & { href: string }) {
  return (
    <Link href={href} className={cn(btn(variant, size), className)}>
      {children}
    </Link>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-2xl bg-white ring-1 ring-slate-200/80 shadow-soft", className)}>{children}</div>;
}

export function Pill({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", className)}>
      {children}
    </span>
  );
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-[13px] font-semibold uppercase tracking-[0.14em] text-brand-600", className)}>{children}</p>;
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight text-ink", className)}>
      <span className="grid size-7 place-items-center rounded-lg bg-ink text-white shadow-[0_6px_14px_-6px_rgb(11_16_32/0.7)]">
        <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 10.5l4 4 9-9" />
        </svg>
      </span>
      MarkMate
    </span>
  );
}

export function Icon({ name, className }: { name: "arrow" | "check" | "x" | "spark" | "quote" | "alert" | "book" | "up" | "down" | "minus" | "edit" | "shield"; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    arrow: <path d="M4 10h12m-5-5 5 5-5 5" />,
    check: <path d="M4.5 10.5l3.5 3.5 7.5-8" />,
    x: <path d="M5.5 5.5l9 9m0-9-9 9" />,
    spark: <path d="M10 2.5v4m0 7v4m-7.5-7.5h4m7 0h4M5 5l2.5 2.5m5 5L15 15m0-10-2.5 2.5m-5 5L5 15" />,
    quote: <path d="M7.5 6.5H5a1 1 0 0 0-1 1V10a1 1 0 0 0 1 1h2.5v2.5L5.5 15M15.5 6.5H13a1 1 0 0 0-1 1V10a1 1 0 0 0 1 1h2.5v2.5L13.5 15" />,
    alert: <path d="M10 6.5v4m0 3h.01M8.6 3.4 2.3 14.5A1.6 1.6 0 0 0 3.7 17h12.6a1.6 1.6 0 0 0 1.4-2.5L11.4 3.4a1.6 1.6 0 0 0-2.8 0Z" />,
    book: <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H16v12H5.5A1.5 1.5 0 0 0 4 16.5v-12Zm0 12A1.5 1.5 0 0 0 5.5 18H16" />,
    up: <path d="M10 15.5v-11m-5 5 5-5 5 5" />,
    down: <path d="M10 4.5v11m5-5-5 5-5-5" />,
    minus: <path d="M5 10h10" />,
    edit: <path d="M12.5 4.5l3 3L7 16H4v-3l8.5-8.5Z" />,
    shield: <path d="M10 2.5 3.5 5v5c0 4 2.8 6.6 6.5 7.5 3.7-.9 6.5-3.5 6.5-7.5V5L10 2.5Zm-2.5 7.5 1.8 1.8 3.4-3.6" />,
  };
  return (
    <svg viewBox="0 0 20 20" className={cn("size-4 shrink-0", className)} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths[name]}
    </svg>
  );
}

/** Circular score meter. */
export function ScoreRing({ value, max, size = 120, className }: { value: number; max: number; size?: number; className?: string }) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const color = pct >= 0.75 ? "#10b981" : pct >= 0.4 ? "#f59e0b" : "#f43f5e";
  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#eef0f4" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute text-center leading-none">
        <span className={cn("font-semibold tracking-tight tabular-nums", size < 100 ? "text-lg" : "text-3xl")}>
          {Number.isInteger(value) ? value : value.toFixed(1)}
        </span>
        <span className={cn("text-slate-400", size < 100 ? "text-[11px]" : "text-base")}> / {max}</span>
      </div>
    </div>
  );
}
