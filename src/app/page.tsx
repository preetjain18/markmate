import { SiteFooter, SiteHeader } from "@/components/site";
import { ButtonLink, Card, Eyebrow, Icon, Pill, ScoreRing } from "@/components/ui";
import { loadRubrics } from "@/lib/rubrics";
import { cn, STATUS_META } from "@/lib/ui";

export const dynamic = "force-static";

/** Illustrative example only; clearly labelled on the page. */
const EXAMPLE = [
  { label: "Management's assessment and basis", status: "correct_complete", marks: "1 / 1", quote: "prepared on the going concern basis" },
  { label: "Events or conditions that cast doubt", status: "correct_incomplete", marks: "0.5 / 1", quote: "the company has heavy losses", fix: "Add operating and other examples, such as loss of key management or legal cases." },
  { label: "Material uncertainty, adequate disclosure", status: "not_addressed", marks: "0 / 1", fix: "State the separate 'Material Uncertainty Related to Going Concern' section." },
] as const;

const STEPS = [
  { n: "01", title: "Pick a question", body: "Choose a CA Final Audit question, or paste your own question with its model answer." },
  { n: "02", title: "Write your answer", body: "Type it the way you would in the exam. No sign-up needed." },
  { n: "03", title: "Read your Lost Marks Map", body: "Every marking point, what you wrote for it, why marks were lost and one action to recover them." },
  { n: "04", title: "Rewrite and compare", body: "Fix the answer in the Improvement Lab. MarkMate re-marks it with the same scheme and shows what improved." },
];

export default function Home() {
  const topics = loadRubrics().map((r) => ({ sa: r.sa, topic: r.topic }));
  return (
    <>
      <SiteHeader active="home" />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="bg-grid pointer-events-none absolute inset-0" />
          <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[880px] -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-200/60 via-sky-100/60 to-emerald-100/60 blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-24">
            <div className="animate-fade-up">
              <Pill className="bg-white/80 text-slate-700 ring-slate-200">
                <span className="size-1.5 rounded-full bg-emerald-500" /> CA Final · Audit and Assurance
              </Pill>
              <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-ink sm:text-6xl">
                See exactly why you lost{" "}
                <span className="bg-gradient-to-r from-brand-600 to-sky-500 bg-clip-text text-transparent">every mark.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
                MarkMate checks your practice answer point by point, quotes what you actually wrote, tells you how to win the missing marks,
                and proves what improved when you rewrite.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/practice" size="lg">
                  Check an answer now <Icon name="arrow" />
                </ButtonLink>
                <ButtonLink href="#how" size="lg" variant="secondary">
                  See how it works
                </ButtonLink>
              </div>
              <p className="mt-5 text-sm text-slate-500">Free to try. No login. Feedback in under a minute.</p>
            </div>

            {/* Example Lost Marks Map */}
            <div className="animate-fade-up [animation-delay:120ms]">
              <Card className="relative p-5 shadow-lift sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Example · SA 570 Going Concern</p>
                    <p className="mt-1 font-semibold">Lost Marks Map</p>
                  </div>
                  <ScoreRing value={1.5} max={3} size={76} />
                </div>
                <div className="mt-5 space-y-3">
                  {EXAMPLE.map((p) => {
                    const m = STATUS_META[p.status];
                    return (
                      <div key={p.label} className="relative overflow-hidden rounded-xl bg-slate-50/80 p-3.5 ring-1 ring-slate-200/70">
                        <span className={cn("absolute inset-y-0 left-0 w-1", m.bar)} />
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium">{p.label}</p>
                          <span className="shrink-0 whitespace-nowrap text-sm tabular-nums text-slate-500">{p.marks}</span>
                        </div>
                        <Pill className={cn("mt-2", m.pill)}>{m.label}</Pill>
                        {"quote" in p && (
                          <p className="mt-2 text-[13px] text-slate-600">
                            <span className="text-slate-400">Your answer: </span>
                            <mark className={m.mark}>“{p.quote}”</mark>
                          </p>
                        )}
                        {"fix" in p && (
                          <p className="mt-2 flex gap-1.5 text-[13px] text-brand-700">
                            <Icon name="arrow" className="mt-0.5 size-3.5" />
                            {p.fix}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-4 text-center text-xs text-slate-400">Illustrative example, not a real student result.</p>
              </Card>
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="border-y border-slate-200/70 bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <Eyebrow>The problem</Eyebrow>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Most practice answers never get checked properly.</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-3 lg:col-span-2">
              <Stat value="14.07%" label="passed CA Final, both groups, May 2026 (3,345 of 23,776)" />
              <Stat value="2–3 days" label="typical wait for a test-series answer to be checked by hand" />
              <Stat value="“Need clarity”" label="the kind of remark students get, without the points they missed" small />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Write. See what you missed. Fix it. Prove it.</h2>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <Card key={s.n} className="group p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lift">
                <span className="font-mono text-sm text-brand-600">{s.n}</span>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.body}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Lost Marks Map */}
        <section id="map" className="scroll-mt-20 bg-ink text-white">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
            <div>
              <Eyebrow className="text-brand-300">The Lost Marks Map</Eyebrow>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Not a mark. A map of every mark.</h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-300">
                Instead of a number and a vague remark, you see every point in the marking scheme and exactly where your answer stands on it.
              </p>
              <ButtonLink href="/practice" size="lg" variant="secondary" className="mt-8">
                Try it on your answer <Icon name="arrow" />
              </ButtonLink>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                ["quote", "Evidence from your answer", "Each credited point quotes your own words, checked word for word."],
                ["alert", "Why marks were lost", "A plain reason for every deduction, not “need clarity”."],
                ["arrow", "One action to recover", "A concrete next step for each missed or partial point."],
                ["book", "Missing SA references", "Standards and keywords from the scheme that your answer left out."],
                ["edit", "Presentation tips", "Up to three tips on structure, headings and references."],
                ["up", "Proof of improvement", "Rewrite, re-mark with the same scheme, see recovered points."],
              ].map(([icon, title, body]) => (
                <li key={title} className="rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/10">
                  <Icon name={icon as "quote"} className="size-5 text-brand-300" />
                  <p className="mt-3 font-medium">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Trust */}
        <section id="trust" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <Eyebrow>How we mark</Eyebrow>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">The AI suggests. Code decides the numbers.</h2>
              <p className="mt-4 leading-relaxed text-slate-600">
                MarkMate is built so you can check its work. Faculty can export every judgement and compare it with their own marking.
              </p>
            </div>
            <div className="grid gap-3">
              {[
                "Marks come only from the marking scheme. The AI can't add points, marks or SA references.",
                "Every credited point must quote your answer word for word, or it is held for review with 0 marks.",
                "Marks are capped per point in half-mark steps, and the total is added up in code.",
                "Rewrites are re-marked with the same scheme and version, and the comparison is computed in code.",
                "Marking schemes are drafts until a CA verifies them, and each one is labelled.",
              ].map((t) => (
                <div key={t} className="flex gap-3 rounded-xl bg-white p-4 ring-1 ring-slate-200/80">
                  <Icon name="shield" className="mt-0.5 size-5 text-emerald-600" />
                  <p className="text-[15px] text-slate-700">{t}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Coverage + CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <Card className="overflow-hidden">
            <div className="relative p-8 sm:p-12">
              <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-brand-100 blur-3xl" />
              <div className="relative">
                <Eyebrow>Covered now</Eyebrow>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{topics.length} CA Final Audit topics, plus your own questions</h2>
                <div className="mt-6 flex flex-wrap gap-2">
                  {topics.map((t) => (
                    <span key={t.sa} className="rounded-full bg-slate-50 px-3 py-1.5 text-sm text-slate-700 ring-1 ring-slate-200">
                      <span className="font-medium">{t.sa}</span> · {t.topic}
                    </span>
                  ))}
                </div>
                <ButtonLink href="/practice" size="lg" className="mt-8">
                  Start practising <Icon name="arrow" />
                </ButtonLink>
              </div>
            </div>
          </Card>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Stat({ value, label, small }: { value: string; label: string; small?: boolean }) {
  return (
    <div>
      <p className={cn("font-semibold tracking-tight text-ink", small ? "text-2xl" : "text-4xl")}>{value}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{label}</p>
    </div>
  );
}
