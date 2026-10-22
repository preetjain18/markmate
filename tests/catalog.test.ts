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

  it("places every Audit question under CA Final Audit, with matching marks and text", () => {
    for (const q of catalog.view.questions) {
      const r = catalog.rubrics.get(q.id)!;
      expect(q.levelId).toBe("final");
      expect(q.subjectId).toBe("final-audit");
      expect(q.maxMarks).toBe(r.maxMarks);
      expect(q.text).toBe(r.question);
    }
  });

  it("reports honest subject status: Audit evaluable but unverified, others coming soon", () => {
    expect(subject("final-audit").stats).toEqual({ questions: 10, evaluable: 10, verified: 0 });
    expect(subject("final-audit").status).toBe("evaluation");
    expect(subject("final-financial-reporting").status).toBe("coming-soon");
    expect(subject("inter-audit").status).toBe("coming-soon");
  });

  it("never marks a question verified without a verified rubric", () => {
    expect(catalog.view.questions.every((q) => q.support === "unverified")).toBe(true);
  });

  it("keeps empty chapters (for the empty state) and counts questions per chapter", () => {
    const chapters = subject("final-audit").chapters;
    expect(chapters.find((c) => c.id === "sa-300-series")!.count).toBe(0);
    expect(chapters.find((c) => c.id === "sa-500-series")!.count).toBe(5);
    expect(chapters.reduce((s, c) => s + c.count, 0)).toBe(10);
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
