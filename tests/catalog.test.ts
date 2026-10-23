import { describe, expect, it } from "vitest";
import { subjectStatus } from "@/lib/catalog-types";
import { buildCatalog, loadCatalog, resolveForEvaluation, type CatalogFile } from "@/lib/catalog";
import { loadRubrics } from "@/lib/rubrics";

const catalog = loadCatalog();
const subject = (id: string) => catalog.view.levels.flatMap((l) => l.subjects).find((s) => s.id === id)!;

describe("practice catalog (real data)", () => {
  it("has the three CA levels", () => {
    expect(catalog.view.levels.map((l) => l.id)).toEqual(["foundation", "intermediate", "final"]);
  });

  it("lists every rubric exactly once, with nothing dangling", () => {
    const ids = catalog.view.questions.map((q) => q.id).sort();
    expect(ids).toEqual(loadRubrics().map((r) => r.id).sort());
  });

  it("gives every question its own rubric's marks and text", () => {
    for (const q of catalog.view.questions) {
      const r = catalog.rubrics.get(q.id)!;
      expect(q.maxMarks).toBe(r.maxMarks);
      expect(q.text).toBe(r.question);
    }
  });

  it("keeps the SA questions under CA Final Audit and the others under their own papers", () => {
    expect(catalog.view.questions.find((q) => q.id === "sa-570-going-concern")).toMatchObject({ subjectId: "final-audit", chapterId: "sa-500-series" });
    expect(catalog.view.questions.find((q) => q.id === "fnd-law-valid-contract")).toMatchObject({ levelId: "foundation", subjectId: "foundation-business-laws" });
    expect(catalog.view.questions.find((q) => q.id === "int-aud-sa200-objectives")).toMatchObject({ levelId: "intermediate", subjectId: "inter-audit" });
  });

  it("gives every paper several chapters and questions, all evaluable, none claimed verified", () => {
    for (const level of catalog.view.levels)
      for (const s of level.subjects) {
        expect(s.chapters.length, s.id).toBeGreaterThanOrEqual(4);
        expect(s.stats.questions, s.id).toBeGreaterThanOrEqual(6);
        expect(s.stats.evaluable, s.id).toBe(s.stats.questions);
        expect(s.stats.verified, s.id).toBe(0);
        expect(s.status, s.id).toBe("evaluation");
      }
  });

  it("backs every marking scheme with its sources and every point with its basis", () => {
    for (const r of catalog.rubrics.values()) {
      expect(r.sources.length, r.id).toBeGreaterThan(0);
      for (const p of r.points) expect(p.basis?.trim(), `${r.id} ${p.id}`).toBeTruthy();
      expect(catalog.view.questions.find((q) => q.id === r.id)?.source, r.id).toBe(r.sa);
    }
  });

  it("never marks a question verified without a verified rubric", () => {
    expect(catalog.view.questions.every((q) => q.support === "unverified")).toBe(true);
  });

  it("counts questions per chapter", () => {
    for (const s of catalog.view.levels.flatMap((l) => l.subjects))
      expect(s.chapters.reduce((n, c) => n + c.count, 0), s.id).toBe(s.stats.questions);
    expect(subject("final-audit").chapters.find((c) => c.id === "sa-500-series")!.count).toBeGreaterThanOrEqual(5);
  });

  it("resolves a real question to its rubric for evaluation", () => {
    const r = resolveForEvaluation(catalog, "sa-570-going-concern");
    expect(r.kind).toBe("ok");
    expect(resolveForEvaluation(catalog, "no-such-question").kind).toBe("not-found");
  });
});

describe("catalog rules (fixture)", () => {
  const file: CatalogFile = {
    source: "test",
    levels: [
      {
        id: "inter",
        name: "CA Intermediate",
        subjects: [
          {
            id: "inter-tax",
            name: "Taxation",
            category: "tax",
            chapters: [{ id: "c1", name: "Chapter 1", topics: [{ id: "t1", name: "Topic 1", questions: ["plain-q"] }] }],
          },
        ],
      },
    ],
  };

  it("treats a question without a rubric as practice-only and refuses to evaluate it", () => {
    const c = buildCatalog(file, [], [{ id: "plain-q", question: "Explain something." }]);
    expect(c.view.questions[0].support).toBe("none");
    expect(c.view.questions[0].maxMarks).toBeNull();
    expect(c.view.levels[0].subjects[0].status).toBe("practice");
    expect(resolveForEvaluation(c, "plain-q").kind).toBe("unsupported");
  });

  it("fails loudly if the catalog lists a question that doesn't exist", () => {
    expect(() => buildCatalog(file, [], [])).toThrow(/no rubric or question file/);
  });

  it("works out subject status from counts", () => {
    expect(subjectStatus({ questions: 0, evaluable: 0, verified: 0 })).toBe("coming-soon");
    expect(subjectStatus({ questions: 3, evaluable: 0, verified: 0 })).toBe("practice");
    expect(subjectStatus({ questions: 3, evaluable: 2, verified: 0 })).toBe("evaluation");
    expect(subjectStatus({ questions: 3, evaluable: 2, verified: 1 })).toBe("verified");
  });
});
