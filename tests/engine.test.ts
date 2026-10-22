import { describe, expect, it } from "vitest";
import { answerProblem, countWords, MAX_ANSWER_CHARS, MIN_ANSWER_CHARS } from "@/lib/answer";
import { compareAttempts, VersionMismatchError } from "@/lib/compare";
import { evaluate, InputError } from "@/lib/evaluate";
import { quoteInAnswer } from "@/lib/evidence";
import type { ModelCaller } from "@/lib/llm";
import { missingReferences } from "@/lib/references";
import { buildCustomRubric, loadRubrics } from "@/lib/rubrics";
import { RubricSchema, type ModelOutput } from "@/lib/schema";
import { clampMarks, scorePoints } from "@/lib/scoring";

const rubric = loadRubrics().find((r) => r.id === "sa-570-going-concern")!;
const strong =
  "Management prepares the financial statements on the going concern basis and assesses the entity for at least twelve months from the balance sheet date. " +
  "Events such as net current liabilities, losses and loan default can cast doubt. " +
  "The auditor evaluates management's plans and cash flow forecasts and whether they are feasible. " +
  "If a material uncertainty exists and is adequately disclosed, the auditor gives an unmodified opinion with a separate section on Material Uncertainty Related to Going Concern as per SA 570. " +
  "If disclosure is inadequate, the auditor expresses a qualified or adverse opinion under SA 705.";
const weak = "The company should be audited every year and the auditor must check the books carefully and sign the report.";

const out = (): ModelOutput => ({
  points: rubric.points.map((p) => ({ pointId: p.id, status: "not_addressed", marks: 0, evidenceQuote: "", reason: "", toRecover: "x" })),
  presentationTips: [],
});

describe("rubrics", () => {
  it("loads the unverified rubrics (10 CA Final Audit + 29 other papers) whose marks add up", () => {
    const all = loadRubrics();
    expect(all).toHaveLength(39);
    expect(all.every((r) => r.verified === false)).toBe(true);
  });
});

describe("evidence", () => {
  it("matches quotes after whitespace and case normalisation only", () => {
    expect(quoteInAnswer("GOING   concern basis", strong)).toBe(true);
    expect(quoteInAnswer("going concern assumption", strong)).toBe(false);
  });
});

describe("scoring", () => {
  it("clamps marks to the allocation in half steps", () => {
    expect(clampMarks(7, 1)).toBe(1);
    expect(clampMarks(-2, 1)).toBe(0);
    expect(clampMarks(0.7, 1)).toBe(0.5);
    expect(clampMarks(NaN, 1)).toBe(0);
  });

  it("turns an unquoted credit into uncertain with 0 marks", () => {
    const o = out();
    o.points[0] = { ...o.points[0], status: "correct_complete", marks: 1, evidenceQuote: "invented text not in answer" };
    const r = scorePoints(rubric, strong, o);
    expect(r[0].aiStatus).toBe("uncertain");
    expect(r[0].aiMarks).toBe(0);
    expect(r[0].needsReview).toBe(true);
  });

  it("ignores duplicates and unknown ids", () => {
    const o = out();
    o.points[0] = { ...o.points[0], status: "correct_complete", marks: 5, evidenceQuote: "going concern basis" };
    o.points.push({ ...o.points[0], marks: 1 }, { ...o.points[0], pointId: "zzz" });
    const r = scorePoints(rubric, strong, o);
    expect(r).toHaveLength(rubric.points.length);
    expect(r[0].aiMarks).toBe(1);
  });
});

describe("references", () => {
  it("finds references the answer never mentions", () => {
    expect(missingReferences(rubric, "As per SA-570 the auditor ...")).toEqual(["SA 705"]);
  });
});

describe("local marker (no AI)", () => {
  it("gives a strong answer most marks and every quote verifies", async () => {
    const r = await evaluate({ rubric, answer: strong });
    expect(r.estimatedMarks).toBeGreaterThanOrEqual(4);
    expect(r.points.filter((p) => p.aiMarks > 0).every((p) => p.evidenceVerified)).toBe(true);
    expect(r.aiUsed).toBe(false);
  });

  it("quotes the sentence that holds the point's keyword phrase", async () => {
    const sa230 = loadRubrics().find((r) => r.id === "sa-230-audit-documentation")!;
    const answer =
      "Audit documentation provides evidence of the basis for the auditor's report. It should enable an experienced auditor to understand the nature, timing and extent of procedures. The final audit file must be assembled within 60 days.";
    const r = await evaluate({ rubric: sa230, answer });
    expect(r.points.find((p) => p.pointId === "p4")!.evidenceQuote).toContain("60 days");
  });

  it("gives an off-topic answer almost nothing", async () => {
    expect((await evaluate({ rubric, answer: weak })).estimatedMarks).toBeLessThanOrEqual(1);
  });

  it("rejects short answers", async () => {
    await expect(evaluate({ rubric, answer: "short" })).rejects.toBeInstanceOf(InputError);
  });

  it("computes the rewrite comparison in code and refuses cross-version comparison", async () => {
    const first = await evaluate({ rubric, answer: weak });
    const second = await evaluate({ rubric, answer: strong, previous: first });
    expect(second.estimatedMarks).toBeGreaterThan(first.estimatedMarks);
    expect(second.comparison!.recovered.length + second.comparison!.improved.length).toBeGreaterThan(0);
    expect(() => compareAttempts({ ...first, rubricVersion: "2" }, rubric.id, rubric.version, second.points, 1)).toThrow(VersionMismatchError);
  });
});

describe("AI marker with a mock model", () => {
  const mock = (data: unknown): ModelCaller => async () => ({ data, model: "gemini-mock" });

  it("uses the AI's judgements, with code still checking quotes", async () => {
    const o = out();
    o.points[0] = { ...o.points[0], status: "correct_complete", marks: 1, evidenceQuote: "going concern basis" };
    o.points[1] = { ...o.points[1], status: "correct_complete", marks: 1, evidenceQuote: "made up quote" };
    const r = await evaluate({ rubric, answer: strong, callModel: mock(o) });
    expect(r.aiUsed).toBe(true);
    expect(r.model).toBe("gemini-mock");
    expect(r.estimatedMarks).toBe(1);
    expect(r.points[1].aiStatus).toBe("uncertain");
  });

  it("retries once on invalid output", async () => {
    let calls = 0;
    const caller: ModelCaller = async () => ({ data: ++calls === 1 ? { nope: true } : out(), model: "gemini-mock" });
    const r = await evaluate({ rubric, answer: strong, callModel: caller });
    expect(calls).toBe(2);
    expect(r.aiUsed).toBe(true);
  });

  it("falls back to the local marker when the AI fails", async () => {
    const broken: ModelCaller = async () => {
      throw new Error("Gemini is busy");
    };
    const r = await evaluate({ rubric, answer: strong, callModel: broken });
    expect(r.aiUsed).toBe(false);
    expect(r.aiError).toMatch(/busy/);
    expect(r.estimatedMarks).toBeGreaterThan(0);
  });
});

describe("answer validation (shared by page and server)", () => {
  it("rejects empty, too short and too long answers with a message", () => {
    expect(answerProblem("")).toMatch(/Write your answer/);
    expect(answerProblem("   \n ")).toMatch(/Write your answer/);
    expect(answerProblem("Too short.")).toMatch(/too short/);
    expect(answerProblem("x".repeat(MAX_ANSWER_CHARS + 1))).toMatch(/too long/);
    expect(answerProblem(strong)).toBeNull();
  });

  it("agrees with the server: anything the page accepts, evaluate accepts", async () => {
    const edge = "a".repeat(MIN_ANSWER_CHARS);
    expect(answerProblem(edge)).toBeNull();
    await expect(evaluate({ rubric, answer: edge })).resolves.toBeTruthy();
    await expect(evaluate({ rubric, answer: edge.slice(1) })).rejects.toBeInstanceOf(InputError);
  });

  it("counts words", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("  going   concern\nbasis ")).toBe(3);
  });
});

describe("custom rubric", () => {
  it("drafts points whose marks add up to the total, unverified", () => {
    const model =
      "An auditor must obtain written representations from management. The letter is dated on the date of the report. If management refuses, consider a disclaimer of opinion under SA 705. Reliability must be reconsidered when integrity is doubted.";
    const r = buildCustomRubric("What are written representations?", model, 5);
    expect(RubricSchema.safeParse(r).success).toBe(true);
    expect(r.verified).toBe(false);
  });
});
