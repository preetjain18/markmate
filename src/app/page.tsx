import Link from "next/link";
import { DailyCard } from "@/components/DailyCard";
import { AttemptsMini, FeedbackTracePreview, HeroPreview, MapMini, SampleLabel } from "@/components/landing/previews";
import { SiteFooter, SiteHeader } from "@/components/site";
import { ButtonLink, Eyebrow, Icon, SectionHeading, type IconName } from "@/components/ui";
import { loadCatalog } from "@/lib/catalog";

const FLOW: { icon: IconName; title: string; body: string }[] = [
  { icon: "camera", title: "Scan", body: "Photograph your handwritten answer sheet, or upload a PDF. Up to 4 files." },
  { icon: "edit", title: "Review", body: "Check the text we read against your sheet, side by side, and fix anything misread." },
  { icon: "scan", title: "Diagnose", body: "See each marking point covered, half-covered, missed or contradicted, with your own words as proof." },
  { icon: "refresh", title: "Improve", body: "Rewrite with the gaps in front of you. Your first attempt stays exactly as marked." },
  { icon: "compare", title: "Compare", body: "Re-marked against the same scheme: which gaps you fixed, which remain, and any new errors." },
];

const VERSUS: [string, string, string][] = [
  ["How it marks", "Gives a general opinion on your answer", "Checks your answer against the question's fixed marking points"],
  ["Evidence", "Paraphrases what you might have meant", "Quotes your exact words, and only credits points it can quote"],
  ["Your handwriting", "Usually needs you to type everything out", "Reads your answer sheet, then lets you correct it before marking"],
  ["Your rewrite", "Starts a new conversation", "Re-marks it against the same scheme and shows exactly what changed"],
  ["Over time", "Forgets your last answer", "Remembers your recurring weak points and suggests what to practise"],
];

export default function Home() {
  const catalog = loadCatalog().view;
  const names = Object.fromEntries(catalog.levels.flatMap((l) => [[l.id, l.name], ...l.subjects.map((s) => [s.id, s.short ?? s.name])]));
  return (
    <>
      <SiteHeader active="home" />
      <main>
        {/* Hero */}
        <section className="border-b border-line">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
            <div className="animate-fade-in">
              <Eyebrow>For CA Foundation, Intermediate and Final students</Eyebrow>
              <h1 className="mt-4 text-hero-sm font-bold sm:text-[3.25rem] sm:leading-[1.08] lg:text-hero">Stop losing marks on answers you thought were right.</h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
                Scan your handwritten answer. MarkMate shows which marking points earned marks, which lost them, and exactly what to write next time. Then it proves
                your rewrite is better.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/scan" size="lg">
                  <Icon name="camera" /> Scan My Answer
                </ButtonLink>
                <ButtonLink href="/practice" size="lg" variant="secondary">
                  Explore Practice Questions
                </ButtonLink>
              </div>
              <ul className="mt-6 flex flex-col gap-2 text-sm text-muted sm:flex-row sm:gap-5">
                <li className="flex items-center gap-1.5">
                  <Icon name="check" className="text-success" /> No login
                </li>
                <li className="flex items-center gap-1.5">
                  <Icon name="check" className="text-success" /> Photos or PDF
                </li>
                <li className="flex items-center gap-1.5">
                  <Icon name="check" className="text-success" /> Every CA paper
                </li>
              </ul>
            </div>
            <div className="min-w-0">
              <HeroPreview />
            </div>
          </div>
        </section>

        {/* Papers */}
        <section aria-labelledby="papers-heading" className="border-b border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Eyebrow>Every paper covered</Eyebrow>
                <h2 id="papers-heading" className="mt-2 text-[1.5rem] font-bold leading-tight sm:text-[1.75rem]">
                  Practise the way your syllabus is organised.
                </h2>
              </div>
              <p className="max-w-sm text-[15px] text-muted">Pick your level, paper and chapter. Each question&apos;s marking scheme names the law or standard behind it.</p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {catalog.levels.map((l) => (
                <Link
                  key={l.id}
                  href={`/practice?level=${l.id}`}
                  className="group rounded-card bg-canvas p-5 ring-1 ring-line transition-[box-shadow,background-color] duration-150 hover:bg-surface hover:shadow-lift"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-[17px] font-semibold">{l.name}</h3>
                    <Icon name="arrow" className="size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {l.subjects.map((s) => (
                      <li key={s.id} className="flex items-baseline justify-between gap-3 text-[14px]">
                        <span className="text-ink">{s.short ?? s.name}</span>
                        <span className="shrink-0 text-[12px] text-muted">
                          {s.chapters.length} chapter{s.chapters.length === 1 ? "" : "s"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section id="how-it-works" className="scroll-mt-16 mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
          <SectionHeading eyebrow="How it works" title="Scan, review, diagnose, improve, compare." />
          <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
            {FLOW.map((s, i) => (
              <li key={s.title} className="relative">
                {i < FLOW.length - 1 && <span aria-hidden className="absolute left-12 right-0 top-5 hidden h-px bg-line lg:block" />}
                <span className="relative grid size-10 place-items-center rounded-full bg-brand text-white">
                  <Icon name={s.icon} className="size-[18px]" />
                </span>
                <p className="mt-4 font-mono text-[12px] text-muted">Step {i + 1}</p>
                <h3 className="mt-0.5 text-[18px] font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Inside the feedback */}
        <section id="features" className="scroll-mt-16 border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <SectionHeading
                eyebrow="The Lost Marks Map"
                title="Every lost mark is traced back to your own words."
                description="Like a careful examiner's margin notes: what you wrote, the marking point it was judged against, why marks were lost, and what to write instead."
              />
              <SampleLabel className="self-start md:self-end" />
            </div>
            <div className="mt-10">
              <FeedbackTracePreview />
            </div>
          </div>
        </section>

        {/* Improvement */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <Eyebrow>The Improvement Lab</Eyebrow>
              <h2 className="mt-2 text-[1.75rem] font-bold leading-tight sm:text-section">Don&apos;t just get a mark. Win it back.</h2>
              <p className="mt-4 text-[17px] leading-relaxed text-muted">
                Rewrite with the gaps beside your editor, then re-mark against the same scheme. MarkMate shows which points you recovered, which still need work, and
                any new mistakes. Extra length alone earns nothing.
              </p>
              <div className="mt-6 space-y-3">
                <MapMini />
              </div>
            </div>
            <div className="min-w-0">
              <AttemptsMini />
              <p className="mt-3 text-[12px] text-muted">Sample preview · illustrative content</p>
            </div>
          </div>
        </section>

        {/* Not a chat */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
            <SectionHeading
              eyebrow="Why not just ask an AI chat?"
              title="Built like an examiner, not a chatbot."
              description="A chat can tell you an answer looks good. MarkMate tells you which marks it earned, and proves it."
            />
            <div className="mt-10 overflow-hidden rounded-card ring-1 ring-line">
              <table className="w-full text-left text-[15px]">
                <thead className="bg-canvas text-[13px] text-muted">
                  <tr>
                    <th scope="col" className="hidden px-5 py-3 font-medium sm:table-cell" />
                    <th scope="col" className="px-5 py-3 font-medium">A general AI chat</th>
                    <th scope="col" className="px-5 py-3 font-semibold text-brand">MarkMate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-surface">
                  {VERSUS.map(([k, a, b]) => (
                    <tr key={k} className="align-top">
                      <th scope="row" className="hidden w-40 px-5 py-4 font-medium text-ink sm:table-cell">
                        {k}
                      </th>
                      <td className="px-5 py-4 text-muted">
                        <span className="mb-1 block text-[12px] font-medium text-ink sm:hidden">{k}</span>
                        {a}
                      </td>
                      <td className="px-5 py-4 text-ink">
                        <span className="flex gap-2">
                          <Icon name="check" className="mt-1 text-success" />
                          {b}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-[13px] text-muted">
              Marks are practice estimates from MarkMate&apos;s marking schemes, not ICAI marks. The AI suggests; MarkMate&apos;s code decides the numbers.
            </p>
          </div>
        </section>

        {/* Today */}
        <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6" aria-label="Question of the day">
          <h2 className="mb-4 text-[1.375rem] font-bold">Not sure where to start? Try today&apos;s question.</h2>
          <DailyCard questions={catalog.questions} names={names} />
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
          <div className="rounded-card bg-brand px-6 py-14 text-center sm:px-12">
            <h2 className="text-[1.75rem] font-bold text-white sm:text-section">Your next answer can be better.</h2>
            <p className="mx-auto mt-3 max-w-md text-[17px] leading-relaxed text-mint">Scan one answer. See your gaps. Improve your next attempt.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/scan" size="lg" variant="secondary" className="ring-0 focus-visible:outline-white">
                <Icon name="camera" /> Scan My Answer
              </ButtonLink>
              <Link
                href="/practice"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-control px-6 font-display text-base font-semibold text-white ring-1 ring-inset ring-white/30 transition-colors hover:bg-white/10 focus-visible:outline-white"
              >
                Explore Practice Questions <Icon name="arrow" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
