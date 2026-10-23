import { describe, expect, it } from "vitest";
import { analyseAttempts, attemptOrder, headlineRates, rankChapters, type PassRate, type WeightPaper } from "@/lib/exam";
import { loadExamInsights } from "@/lib/exam-data";

const rate = (attempt: string, passPercent: number | null, group: PassRate["group"] = "both", level: PassRate["level"] = "intermediate"): PassRate => ({
  level,
  attempt,
  group,
  passPercent,
  appeared: null,
  passed: null,
  sourceUrl: "https://example.org/r",
  sourceType: "icai",
  sourceTitle: "",
});

describe("attempt analysis", () => {
  it("orders attempts by month and year", () => {
    expect(attemptOrder("May 2025")).toBeGreaterThan(attemptOrder("Nov 2024"));
    expect(attemptOrder("September 2025")).toBeGreaterThan(attemptOrder("May 2025"));
    expect(attemptOrder("nonsense")).toBe(0);
  });

  it("uses the both-groups figure for Inter, falling back to a group, newest first", () => {
    const rows = headlineRates([rate("May 2024", 19.4, "both"), rate("May 2024", 27.2, "group1"), rate("Nov 2024", 30, "group1"), rate("Nov 2024", null, "both")], "intermediate");
    expect(rows.map((r) => [r.attempt, r.group])).toEqual([
      ["Nov 2024", "group1"],
      ["May 2024", "both"],
    ]);
  });

  it("labels attempts against the average and finds the lowest and highest pass rate", () => {
    const a = analyseAttempts([rate("A 2024", 10), rate("B 2024", 20), rate("C 2024", 30)]);
    expect(a.average).toBe(20);
    expect(a.rows.map((r) => r.band)).toEqual(["lower", "typical", "higher"]);
    expect(a.hardest?.attempt).toBe("A 2024");
    expect(a.easiest?.attempt).toBe("C 2024");
    expect(analyseAttempts([rate("A 2024", 10)]).hardest).toBeNull();
  });

  it("ranks sections within each part, so a part's percentages are never compared with another's", () => {
    const paper: WeightPaper = {
      level: "intermediate",
      paper: "Tax",
      unit: "percent",
      sourceUrl: "https://example.org/w",
      sourceType: "icai",
      sourceTitle: "",
      items: [
        { name: "it-small", min: 10, max: 20, text: "", part: "Income-tax" },
        { name: "gst-big", min: 40, max: 50, text: "", part: "GST" },
        { name: "it-big", min: 25, max: 30, text: "", part: "Income-tax" },
      ],
    };
    const groups = rankChapters(paper);
    expect(groups.map((g) => [g.part, g.items.map((i) => i.name)])).toEqual([
      ["Income-tax", ["it-big", "it-small"]],
      ["GST", ["gst-big"]],
    ]);
    expect(groups[0].items.map((i) => i.focus)).toEqual([true, false]);
  });

  it("ranks sections by weightage and flags the heaviest third (ties included)", () => {
    const paper: WeightPaper = {
      level: "intermediate",
      paper: "X",
      unit: "percent",
      sourceUrl: "https://example.org/w",
      sourceType: "icai",
      sourceTitle: "",
      items: [
        { name: "a", min: 5, max: 10, text: "" },
        { name: "b", min: 15, max: 20, text: "" },
        { name: "c", min: 10, max: 15, text: "" },
        { name: "d", min: 10, max: 15, text: "" },
        { name: "e", min: 1, max: 5, text: "" },
      ],
    };
    const [g] = rankChapters(paper);
    expect(g.part).toBeNull();
    expect(g.items.map((x) => x.name)).toEqual(["b", "c", "d", "a", "e"]);
    // 5 sections: the heaviest third is the top 2, and "d" ties with "c".
    expect(g.items.filter((x) => x.focus).map((x) => x.name)).toEqual(["b", "c", "d"]);
  });
});

describe("exam insights data", () => {
  const data = loadExamInsights();
  it("links every figure to a source", () => {
    for (const r of data.passRates) expect(r.sourceUrl).toMatch(/^https:\/\//);
    for (const p of data.weightage) expect(p.sourceUrl).toMatch(/^https:\/\//);
  });
  it("keeps weightage ranges sane", () => {
    for (const p of data.weightage) for (const it of p.items) expect(it.max, `${p.paper}: ${it.name}`).toBeGreaterThanOrEqual(it.min);
  });
});
