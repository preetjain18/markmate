import { AttemptsMini, FeedbackTracePreview, HeroPreview, MapMini, SampleLabel } from "@/components/landing/previews";
import { SiteFooter, SiteHeader } from "@/components/site";
import { ButtonLink, Card, Eyebrow, Icon, SectionHeading, type IconName } from "@/components/ui";

const PROBLEMS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "target",
    title: "Missing key marking points",
    body: "You know the standard, but the examiner's points you skipped never come back as marks.",
  },
  {
    icon: "partial",
    title: "Correct, but incomplete",
    body: "A right idea written halfway earns half the marks, and it is hard to see which half is missing.",
  },
  {
    icon: "compass",
    title: "No clear next step",
    body: "Reading the suggested answer tells you what it says, not what your own answer should change.",
  },
];

const STEPS: { icon: IconName; title: string; body: string }[] = [
  { icon: "notebook", title: "Practise", body: "Choose a CA Final Audit question and write your answer." },
  {
    icon: "scan",
    title: "Find Lost Marks",
    body: "See which marking points were missed, partially covered, or supported by your answer.",
  },
  { icon: "refresh", title: "Improve", body: "Rewrite your answer and compare your attempts to see what changed." },
];

export default function Home() {
  return (
    <>
      <SiteHeader active="home" />
      <main>
        {/* Hero */}
        <section className="border-b border-line">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-24">
            <div className="animate-fade-in">
              <Eyebrow>For CA Final Audit</Eyebrow>
              <h1 className="mt-4 text-hero-sm font-bold sm:text-[3.25rem] sm:leading-[1.08] lg:text-hero">
                Stop losing marks on answers you thought were right.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
                Practise CA Final Audit with feedback that shows what you missed, why it matters, and how to write a better answer next time.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/practice" size="lg">
                  Start Practising <Icon name="arrow" />
                </ButtonLink>
                <ButtonLink href="#how-it-works" size="lg" variant="secondary">
                  See How It Works
                </ButtonLink>
              </div>
              <p className="mt-6 flex items-center gap-2 text-sm text-muted">
                <Icon name="shield" className="text-brand" /> Built for CA answer-writing practice
              </p>
            </div>
            <div className="min-w-0">
              <HeroPreview />
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
          <SectionHeading title="Knowing the concept isn't the same as scoring the marks." />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PROBLEMS.map((p) => (
              <Card key={p.title} className="p-6">
                <span className="grid size-10 place-items-center rounded-control bg-subtle text-ink">
                  <Icon name={p.icon} className="size-5" />
                </span>
                <h3 className="mt-5 text-card font-semibold">{p.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{p.body}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-16 border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
            <SectionHeading eyebrow="How it works" title="Three steps from first draft to a better answer." />
            <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative">
                  {i < STEPS.length - 1 && <span aria-hidden className="absolute left-14 right-0 top-6 hidden h-px bg-line md:block" />}
                  <div className="flex items-center gap-3">
                    <span className="relative grid size-12 place-items-center rounded-full bg-brand text-white">
                      <Icon name={s.icon} className="size-5" />
                    </span>
                    <span className="font-mono text-sm text-muted">Step {i + 1}</span>
                  </div>
                  <h3 className="mt-5 text-card font-semibold">{s.title}</h3>
                  <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-16 mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
          <SectionHeading eyebrow="Features" title="Built around the marks you lose, not just the mark you get." />
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <FeatureCard
              icon="map"
              title="Lost Marks Map"
              body="Understand exactly which marking points your answer covered, missed, or only partially addressed."
              bullets={["A quote from your answer for every credited point", "A plain reason for each deduction", "One concrete action to recover the mark"]}
            >
              <MapMini />
            </FeatureCard>
            <FeatureCard
              icon="compare"
              title="Improvement Lab"
              body="Rewrite your answer, compare attempts, and see whether you addressed the missing marking points."
              bullets={["Re-marked against the same marking scheme", "Recovered, improved and still-missing points listed", "Extra length alone earns nothing"]}
            >
              <AttemptsMini />
            </FeatureCard>
          </div>
          <Card className="mt-5 flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
            <span className="grid size-10 shrink-0 place-items-center rounded-control bg-subtle text-ink">
              <Icon name="question" className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-[17px] font-semibold">Practise with your own questions</h3>
              <p className="mt-1 text-[15px] text-muted">
                Paste a question and its model answer. MarkMate drafts the marking points, and you check the marks before your answer is marked.
              </p>
            </div>
            <ButtonLink href="/practice" variant="secondary" size="sm" className="self-start sm:self-center">
              Try it
            </ButtonLink>
          </Card>
        </section>

        {/* Product preview */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <SectionHeading
                eyebrow="Inside the feedback"
                title="Every lost mark is traced back to your own words."
                description="Feedback links what you wrote to the marking point it was judged against, why marks were lost, and what to write instead."
              />
              <SampleLabel className="self-start md:self-end" />
            </div>
            <div className="mt-10">
              <FeedbackTracePreview />
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
          <div className="rounded-card bg-brand px-6 py-14 text-center sm:px-12">
            <h2 className="text-[1.75rem] font-bold text-white sm:text-section">Your next answer can be better.</h2>
            <p className="mx-auto mt-3 max-w-md text-[17px] leading-relaxed text-mint">
              Start with one question. Understand your gaps. Improve your next attempt.
            </p>
            <ButtonLink href="/practice" size="lg" variant="secondary" className="mt-8 ring-0 focus-visible:outline-white">
              Start Practising <Icon name="arrow" />
            </ButtonLink>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function FeatureCard({
  icon,
  title,
  body,
  bullets,
  children,
}: {
  icon: IconName;
  title: string;
  body: string;
  bullets: string[];
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="p-6 sm:p-8">
        <span className="grid size-10 place-items-center rounded-control bg-mint text-brand">
          <Icon name={icon} className="size-5" />
        </span>
        <h3 className="mt-5 font-display text-2xl font-bold">{title}</h3>
        <p className="mt-2 text-[16px] leading-relaxed text-muted">{body}</p>
        <ul className="mt-5 space-y-2">
          {bullets.map((b) => (
            <li key={b} className="flex gap-2 text-[15px] text-ink">
              <Icon name="check" className="mt-1 text-success" /> {b}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-auto border-t border-line bg-canvas p-5 sm:p-6">{children}</div>
    </Card>
  );
}
