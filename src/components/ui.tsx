/**
 * MarkMate's reusable UI. Every component styles itself only with the design tokens
 * from globals.css (bg-brand, text-muted, ring-line, rounded-card, font-display, ...).
 */
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Check,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Compass,
  CornerDownRight,
  FileQuestion,
  GitCompareArrows,
  Inbox,
  Info,
  Lightbulb,
  ListChecks,
  LoaderCircle,
  Map as MapIcon,
  Menu,
  Minus,
  NotebookPen,
  PenLine,
  Quote,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Target,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn, TONE, type Tone } from "@/lib/ui";

/* ---------------------------------- Icons --------------------------------- */

const ICONS = {
  arrow: ArrowRight,
  back: ArrowLeft,
  check: Check,
  x: X,
  spark: Sparkles,
  quote: Quote,
  alert: TriangleAlert,
  book: BookOpen,
  up: ArrowUp,
  down: ArrowDown,
  minus: Minus,
  edit: PenLine,
  shield: ShieldCheck,
  info: Info,
  error: CircleAlert,
  success: CircleCheck,
  chevron: ChevronRight,
  inbox: Inbox,
  loader: LoaderCircle,
  notebook: NotebookPen,
  map: MapIcon,
  refresh: RefreshCw,
  target: Target,
  partial: CircleDashed,
  compass: Compass,
  menu: Menu,
  question: FileQuestion,
  checklist: ListChecks,
  compare: GitCompareArrows,
  corner: CornerDownRight,
  idea: Lightbulb,
  scan: ScanSearch,
} satisfies Record<string, LucideIcon>;
export type IconName = keyof typeof ICONS;

/** Lucide line icon. 16px by default, 1.75 stroke, inherits text colour. */
export function Icon({ name, className }: { name: IconName; className?: string }) {
  const C = ICONS[name];
  return <C className={cn("size-4 shrink-0", className)} strokeWidth={1.75} aria-hidden />;
}

/* --------------------------------- Buttons -------------------------------- */

type BtnVariant = "primary" | "secondary" | "ghost";
type BtnSize = "sm" | "md" | "lg";
type BtnProps = { variant?: BtnVariant; size?: BtnSize; className?: string; children: React.ReactNode };

export const buttonClass = (variant: BtnVariant = "primary", size: BtnSize = "md") =>
  cn(
    "inline-flex items-center justify-center gap-2 rounded-control font-display font-semibold whitespace-nowrap",
    "transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45",
    size === "sm" && "h-9 px-3.5 text-sm",
    size === "md" && "h-11 px-5 text-[15px]",
    size === "lg" && "h-12 px-6 text-base",
    variant === "primary" && "bg-brand text-white hover:bg-brand-dark active:bg-brand-950",
    variant === "secondary" && "bg-surface text-ink ring-1 ring-inset ring-line-strong hover:bg-canvas hover:ring-muted/40",
    variant === "ghost" && "text-muted hover:bg-subtle hover:text-ink",
  );

export function Button({ variant, size, className, children, ...rest }: BtnProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(buttonClass(variant, size), className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({ href, variant, size, className, children }: BtnProps & { href: string }) {
  return (
    <Link href={href} className={cn(buttonClass(variant, size), className)}>
      {children}
    </Link>
  );
}

/* ------------------------------- Form fields ------------------------------ */

const controlClass =
  "w-full rounded-control bg-surface px-3.5 text-[15px] text-ink ring-1 ring-inset ring-line-strong placeholder:text-muted/70 " +
  "transition-shadow duration-150 hover:ring-muted/50 focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-subtle";

export function Input({ className, invalid, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={cn(controlClass, "h-11", invalid && "ring-error focus:ring-error", className)} aria-invalid={invalid || undefined} {...rest} />;
}

export function Textarea({ className, invalid, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={cn(controlClass, "block resize-y py-3 leading-7", invalid && "ring-error focus:ring-error", className)}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}

/** Label + control + hint/error, wired up for screen readers. */
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-center gap-1.5 text-[13px] text-error">
          <Icon name="error" className="size-3.5" /> {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-[13px] text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/* ----------------------------- Cards and panels --------------------------- */

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-card bg-surface ring-1 ring-line shadow-soft", className)}>{children}</div>;
}

/** A card with a titled header row and an optional action on the right. */
export function Panel({
  title,
  description,
  action,
  className,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
        <div>
          <h3 className="text-card font-semibold">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </Card>
  );
}

/* --------------------------------- Badges --------------------------------- */

export function Badge({ tone = "neutral", dot, className, children }: { tone?: Tone; dot?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] font-medium ring-1 ring-inset", TONE[tone].badge, className)}>
      {dot && <span className={cn("size-1.5 rounded-full", TONE[tone].dot)} />}
      {children}
    </span>
  );
}

/** Older name kept for existing callers: a badge whose colours come from className. */
export function Pill({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] font-medium ring-1 ring-inset", className)}>{children}</span>;
}

/* ------------------------------- Navigation ------------------------------- */

export function NavLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-control px-3 py-2 font-display text-[15px] font-medium transition-colors duration-150",
        active ? "bg-mint text-brand" : "text-muted hover:bg-subtle hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}

/* --------------------------------- Headings ------------------------------- */

/** Small label above a heading. Sentence case, brand colour, no shouting. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("font-display text-sm font-semibold text-brand-600", className)}>{children}</p>;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="mt-2 text-[1.75rem] font-bold leading-tight sm:text-section">{title}</h2>
      {description && <p className="mt-3 text-[17px] leading-relaxed text-muted">{description}</p>}
    </div>
  );
}

/* --------------------------- Loading, empty, errors ----------------------- */

export function Spinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <span role="status" className="inline-flex">
      <LoaderCircle className={cn("size-4 animate-spin text-brand", className)} strokeWidth={2} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Card-sized loading state with a status line and placeholder rows. */
export function LoadingState({ message, detail, rows = 3 }: { message: string; detail?: string; rows?: number }) {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-3">
        <Spinner label={message} className="mt-1" />
        <div>
          <p className="text-[15px] font-medium text-ink">{message}</p>
          {detail && <p className="mt-0.5 text-sm text-muted">{detail}</p>}
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {Array.from({ length: rows }, (_, k) => (
          <div key={k} className="h-14 animate-pulse rounded-control bg-subtle" />
        ))}
      </div>
    </Card>
  );
}

export function EmptyState({ title, description, action, icon = "inbox" }: { title: string; description?: string; action?: React.ReactNode; icon?: IconName }) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-line-strong bg-surface px-6 py-10 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-subtle text-muted">
        <Icon name={icon} className="size-5" />
      </span>
      <p className="mt-3 font-display font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const ALERT_ICON: Record<Tone, IconName> = { brand: "info", success: "success", attention: "alert", error: "error", neutral: "info" };

/** Inline message. Use tone="error" for errors, "attention" for warnings, "neutral"/"brand" for notes. */
export function Alert({ tone = "neutral", title, children, className }: { tone?: Tone; title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-control p-3.5 text-sm ring-1 ring-inset", TONE[tone].alert, className)}>
      <Icon name={ALERT_ICON[tone]} className="mt-0.5" />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <div className={cn(title && "mt-0.5", tone !== "neutral" && "text-ink/85")}>{children}</div>
      </div>
    </div>
  );
}

export const ErrorMessage = ({ children, title }: { children: React.ReactNode; title?: string }) => (
  <Alert tone="error" title={title}>
    {children}
  </Alert>
);

/* ---------------------------------- Brand --------------------------------- */

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display text-[17px] font-bold tracking-tight text-ink", className)}>
      <span className="grid size-7 place-items-center rounded-[8px] bg-brand text-white">
        <Check className="size-4" strokeWidth={2.5} aria-hidden />
      </span>
      MarkMate
    </span>
  );
}

/** Circular score meter. Colour follows the score: green, amber, or red. */
export function ScoreRing({ value, max, size = 120, className }: { value: number; max: number; size?: number; className?: string }) {
  const stroke = size < 100 ? 7 : 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const color = pct >= 0.75 ? "var(--color-success)" : pct >= 0.4 ? "var(--color-accent)" : "var(--color-error)";
  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }} role="img" aria-label={`${value} out of ${max} marks`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-subtle)" strokeWidth={stroke} fill="none" />
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
          style={{ transition: "stroke-dashoffset 600ms ease-out" }}
        />
      </svg>
      <div className="absolute text-center leading-none">
        <span className={cn("font-display font-bold tabular-nums", size < 100 ? "text-lg" : "text-3xl")}>
          {Number.isInteger(value) ? value : value.toFixed(1)}
        </span>
        <span className={cn("text-muted", size < 100 ? "text-[11px]" : "text-base")}> / {max}</span>
      </div>
    </div>
  );
}
