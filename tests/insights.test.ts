import { describe, expect, it } from "vitest";
import { evaluate } from "@/lib/evaluate";
import { countOutcomes, overallAssessment, topPriorities } from "@/lib/insights";
import type { ModelCaller } from "@/lib/llm";
import { loadRubrics } from "@/lib/rubrics";
import type { ModelOutput } from "@/lib/schema";

const rubric = loadRubrics().find((r) => r.id === "sa-570-going-concern")!;
const answer =
  "Management prepares the financial statements on the going concern basis. The company has heavy losses. The auditor should give a clean opinion in all cases.";

// p1 covered, p2 partial, p3 missed, p4 contradicted, p5 uncertain (quote not in answer)
const output: ModelOutput = {
  points: [
    { pointId: "p1", status: "correct_complete", marks: 1, evidenceQuote: "on the going concern basis", reason: "", toRecover: "" },
    { pointId: "p2", status: "correct_incomplete", marks: 0.5, evidenceQuote: "The company has heavy losses", reason: "Only one example.", toRecover: "Add operating examples." },
    { pointId: "p3", status: "not_addressed", marks: 0, evidenceQuote: "", reason: "Not mentioned.", toRecover: "Evaluate management's plans." },
    { pointId: "p4", status: "incorrect", marks: 0, evidenceQuote: "give a clean opinion in all cases", reason: "Wrong.", toRecover: "Explain the material uncertainty section." },
    { pointId: "p5", status: "correct_complete", marks: 1, evidenceQuote: "words the student never wrote", reason: "", toRecover: "" },
  ],
  presentationTips: [],
};
const mock: ModelCaller = async () => ({ data: output, model: "gemini-mock" });

describe("Lost Marks Map insights", async () => {
  const result = await evaluate({ rubric, answer, callModel: mock });

  it("carries the rubric requirement on every point", () => {
    expect(result.points.every((p, i) => p.requirement === rubric.points[i].description)).toBe(true);
  });

  it("counts each outcome from the validated result", () => {
    expect(countOutcomes(result.points)).toEqual({ covered: 1, partial: 1, missed: 1, contradicted: 1, review: 1 });
  });

  it("never treats an unverified quote as evidence", () => {
    const p5 = result.points.find((p) => p.pointId === "p5")!;
    expect(p5.aiStatus).toBe("uncertain");
    expect(p5.evidenceVerified).toBe(false);
    expect(p5.aiMarks).toBe(0);
  });

  it("ranks priorities by marks at stake, wrong statements first on ties, and skips review points", () => {
    const pr = topPriorities(result.points);
    expect(pr.map((p) => p.pointId)).toEqual(["p4", "p3", "p2"]);
    expect(pr[0].outcome).toBe("contradicted");
    expect(pr[2].marksAtStake).toBe(0.5);
    expect(pr.find((p) => p.pointId === "p5")).toBeUndefined();
  });

  it("writes an overall assessment from the counts, naming the biggest gap", () => {
    const text = overallAssessment(result);
    expect(text).toContain("You fully covered 1 of 5 marking points");
    expect(text).toContain("got 1 wrong");
    expect(text).toContain(`“${rubric.points[3].label}”`);
    expect(text).toContain("1 point is held for review");
  });

  it("has nothing to prioritise when every point is covered", async () => {
    const all: ModelOutput = {
      points: rubric.points.map((p) => ({ pointId: p.id, status: "correct_complete", marks: p.marks, evidenceQuote: "going concern basis", reason: "", toRecover: "" })),
      presentationTips: [],
    };
    const full = await evaluate({ rubric, answer, callModel: async () => ({ data: all, model: "m" }) });
    expect(topPriorities(full.points)).toEqual([]);
    expect(overallAssessment(full)).toMatch(/every marking point/);
  });
});
