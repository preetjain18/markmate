import type { Metadata } from "next";
import { SiteHeader } from "@/components/site";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  Field,
  Icon,
  Input,
  LoadingState,
  NavLink,
  Panel,
  ScoreRing,
  SectionHeading,
  Spinner,
  Textarea,
} from "@/components/ui";
import { STATUS_META } from "@/lib/ui";
import type { Status } from "@/lib/schema";

export const metadata: Metadata = { title: "Design system · MarkMate", robots: { index: false } };

const COLOURS = [
  ["brand", "#173F35", "Primary brand: buttons, key actions, selected nav"],
  ["brand-dark", "#102F28", "Hover and dark panels"],
  ["canvas", "#F7F6F2", "Page background"],
  ["surface", "#FFFFFF", "Cards"],
  ["mint", "#D8EEE4", "Soft highlight"],
  ["ink", "#252B29", "Main text"],
  ["muted", "#727873", "Secondary text"],
  ["accent", "#D99B36", "Incomplete, needs attention"],
  ["success", "#237A52", "Secured"],
  ["warning", "#A96812", "Warning text"],
  ["error", "#B54747", "Incorrect only"],
  ["line", "#E3E7E2", "Borders"],
] as const;

/** Living reference for MarkMate's design tokens and reusable components. Not linked from the site. */
export default function DesignPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl space-y-16 px-4 py-12 sm:px-6">
        <SectionHeading eyebrow="Design system" title="MarkMate foundations" description="Tokens live in src/app/globals.css. Components live in src/components/ui.tsx." />

        <Section title="Colour">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {COLOURS.map(([name, hex, use]) => (
              <Card key={name} className="overflow-hidden">
                <div className="h-16 border-b border-line" style={{ background: `var(--color-${name})` }} />
                <div className="p-3">
                  <p className="font-mono text-[13px] text-ink">{name}</p>
                  <p className="font-mono text-[13px] text-muted">{hex}</p>
                  <p className="mt-1 text-[13px] text-muted">{use}</p>
                </div>
              </Card>
            ))}
          </div>
        </Section>

        <Section title="Typography">
          <Card className="space-y-6 p-6 sm:p-8">
            <div>
              <Label>Hero · Manrope bold · 40px mobile, 60px desktop</Label>
              <p className="font-display text-hero-sm font-bold tracking-tight sm:text-hero">See exactly why you lost every mark.</p>
            </div>
            <div>
              <Label>Section heading · Manrope bold · 28px mobile, 36px desktop</Label>
              <h2 className="text-[1.75rem] font-bold sm:text-section">Write. See what you missed. Fix it.</h2>
            </div>
            <div>
              <Label>Card heading · Manrope semibold · 20px</Label>
              <h3 className="text-card font-semibold">Evaluating management&apos;s plans</h3>
            </div>
            <div>
              <Label>Body · Inter · 17px / 1.7</Label>
              <p className="max-w-2xl text-[17px] leading-[1.7]">
                The auditor evaluates management&apos;s plans for future action and the cash flow forecasts, and considers whether they are feasible.
              </p>
            </div>
            <div>
              <Label>Interface label · Inter medium · 13–14px</Label>
              <p className="text-sm font-medium text-muted">40 words · saved on this device</p>
            </div>
          </Card>
        </Section>

        <Section title="Buttons">
          <Card className="flex flex-wrap items-center gap-3 p-6">
            <Button>
              Check my answer <Icon name="arrow" />
            </Button>
            <Button variant="secondary">See how it works</Button>
            <Button variant="ghost">Cancel</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
            <Button disabled>Disabled</Button>
          </Card>
        </Section>

        <Section title="Form fields">
          <Card className="grid gap-5 p-6 md:grid-cols-2">
            <Field id="demo-q" label="Question" hint="Paste the question exactly as set.">
              <Input id="demo-q" placeholder="What is a key audit matter?" />
            </Field>
            <Field id="demo-marks" label="Total marks" error="Marks must add up to 5.">
              <Input id="demo-marks" defaultValue="4.5" invalid />
            </Field>
            <div className="md:col-span-2">
              <Field id="demo-a" label="Your answer">
                <Textarea id="demo-a" rows={4} placeholder="Write your answer the way you would in the exam." />
              </Field>
            </div>
          </Card>
        </Section>

        <Section title="Cards and panels">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-6">
              <h3 className="text-card font-semibold">Card</h3>
              <p className="mt-1 text-[15px] text-muted">White surface, 12px radius, 1px border, very light shadow.</p>
            </Card>
            <Panel title="Panel" description="A card with a header row." action={<Button size="sm" variant="secondary">Action</Button>}>
              <p className="text-[15px] text-muted">Use for grouped content such as the Improvement Lab.</p>
            </Panel>
          </div>
        </Section>

        <Section title="Status badges">
          <Card className="space-y-4 p-6">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(STATUS_META) as Status[]).map((s) => (
                <Badge key={s} tone={STATUS_META[s].tone} dot>
                  {STATUS_META[s].label}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="brand">Brand</Badge>
              <Badge tone="neutral">Unverified scheme</Badge>
              <Badge tone="success">Verified scheme</Badge>
            </div>
            <div className="flex items-center gap-6">
              <ScoreRing value={4.5} max={5} />
              <ScoreRing value={2.5} max={5} />
              <ScoreRing value={1} max={5} size={76} />
            </div>
          </Card>
        </Section>

        <Section title="Navigation and headings">
          <Card className="space-y-6 p-6">
            <div className="flex flex-wrap gap-1">
              <NavLink href="/design" active>
                Selected
              </NavLink>
              <NavLink href="/design">Default</NavLink>
              <NavLink href="/design">Hover me</NavLink>
            </div>
            <SectionHeading eyebrow="How it works" title="Section heading" description="Optional supporting sentence in secondary text." />
          </Card>
        </Section>

        <Section title="Loading, empty and messages">
          <div className="grid gap-4 md:grid-cols-2">
            <LoadingState message="Checking each marking point…" rows={2} />
            <EmptyState title="No attempts yet" description="Write an answer and check it to see your Lost Marks Map." action={<Button size="sm">Start practising</Button>} />
            <div className="space-y-3 md:col-span-2">
              <p className="flex items-center gap-2 text-sm text-muted">
                <Spinner /> Inline spinner
              </p>
              <ErrorMessage title="That didn't work">The answer is too short to mark.</ErrorMessage>
              <Alert tone="attention" title="Held for review">1 mark could not be backed by a quote from your answer.</Alert>
              <Alert tone="success">Saved.</Alert>
              <Alert tone="neutral">The AI was not available, so the local rule-based marker checked this answer.</Alert>
            </div>
          </div>
        </Section>
      </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 text-card font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 font-mono text-[13px] text-muted">{children}</p>;
}
