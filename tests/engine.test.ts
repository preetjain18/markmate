import { describe, expect, it } from "vitest";
import { compareAttempts, VersionMismatchError } from "@/lib/compare";
import { evaluate, InputError } from "@/lib/evaluate";
import { quoteInAnswer } from "@/lib/evidence";
import type { ModelCaller } from "@/lib/llm";
import { missingReferences } from "@/lib/references";
import { loadRubrics } from "@/lib/rubrics";
import { clampMarks, scorePoints } from "@/lib/scoring";

const rubric = loadRubrics().find((r) => r.id === "sa-570-going-concern")!;
const answer =
  "Management prepares the financial statements on the going concern basis. The auditor evaluates management's plans and cash flow forecasts. Net current liabilities cast doubt.";

const out = (over: Record<string, unknown> = {}) => ({
  points: rubric.points.map((p) => ({
    pointId: p.id,
    status: "not_addressed" as const,
    marks: 0,
    evidenceQuote: "",
    reason: "",
    toRecover: "do it",
  })),
  presentationTips: ["a", "b", "c", "d"],
  ...over,
});

describe("rubrics", () => {
  it("loads 10 unverified rubrics whose marks add up", () => {
    const all = loadRubrics();
    expect(all).toHaveLength(10);
    expect(all.every((r) => r.verified === false)).toBe(true);
  });
});

describe("evidence", () => {
  it("matches quotes after whitespace and case normalisation only", () => {
    expect(quoteInAnswer("GOING   concern basis", answer)).toBe(true);
    expect(quoteInAnswer("going concern assumption", answer)).toBe(false);
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
    const r = scorePoints(rubric, answer, o);
    expect(r[0].aiStatus).toBe("uncertain");
    expect(r[0].aiMarks).toBe(0);
    expect(r[0].needsReview).toBe(true);
  });

  it("awards a verified point and ignores duplicates and unknown ids", () => {
    const o = out();
    o.points[0] = { ...o.points[0], status: "correct_complete", marks: 5, evidenceQuote: "going concern basis" };
    o.points.push({ ...o.points[0], marks: 1 }, { ...o.points[0], pointId: "zzz" });
    const r = scorePoints(rubric, answer, o);
    expect(r).toHaveLength(rubric.points.length);
    expect(r[0].aiMarks).toBe(1);
  });
});

describe("references", () => {
  it("finds references the answer never mentions", () => {
    expect(missingReferences(rubric, "As per SA-570 the auditor ...")).toEqual(["SA 705"]);
  });
});

describe("evaluate + compare with a mock model", () => {
  const mock = (data: unknown): ModelCaller => async () => ({ data, model: "google/mock" });

  it("rejects short answers", async () => {
    await expect(evaluate({ rubric, answer: "short", callModel: mock(out()) })).rejects.toBeInstanceOf(InputError);
  });

  it("retries once on invalid output, then marks", async () => {
    let calls = 0;
    const caller: ModelCaller = async () => ({ data: ++calls === 1 ? { nope: true } : out(), model: "google/mock" });
    const r = await evaluate({ rubric, answer, callModel: caller });
    expect(calls).toBe(2);
    expect(r.estimatedMarks).toBe(0);
    expect(r.presentationTips).toHaveLength(3);
  });

  it("computes recovered points in code and refuses cross-version comparison", async () => {
    const first = await evaluate({ rubric, answer, callModel: mock(out()) });
    const o = out();
    o.points[0] = { ...o.points[0], status: "correct_complete", marks: 1, evidenceQuote: "going concern basis" };
    const second = await evaluate({ rubric, answer, callModel: mock(o), previous: first });
    expect(second.estimatedMarks).toBe(1);
    expect(second.comparison!.recovered).toHaveLength(1);
    expect(() => compareAttempts({ ...first, rubricVersion: "2" }, rubric.id, rubric.version, second.points, 1)).toThrow(VersionMismatchError);
  });
});
