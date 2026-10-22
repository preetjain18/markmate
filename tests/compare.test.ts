import { describe, expect, it } from "vitest";
import { compareResults } from "@/lib/compare";
import { evaluate } from "@/lib/evaluate";
import type { ModelCaller } from "@/lib/llm";
import { loadRubrics } from "@/lib/rubrics";
import type { ModelOutput, Status } from "@/lib/schema";

const rubric = loadRubrics().find((r) => r.id === "sa-570-going-concern")!;
const other = loadRubrics().find((r) => r.id === "sa-580-written-representations")!;

const A1 =
  "Management prepares the financial statements on the going concern basis. The company has heavy losses. The auditor should check it.";
const A2 =
  "Management prepares the financial statements on the going concern basis for twelve months. Net current liabilities and loan defaults cast doubt. The auditor evaluates management's plans and cash flow forecasts. The auditor should give a clean opinion in all cases.";

type Spec = [Status, number, string];
const run = (answer: string, specs: Spec[], r = rubric, aiUsed = true) => {
  const out: ModelOutput = {
    points: r.points.map((p, i) => ({ pointId: p.id, status: specs[i][0], marks: specs[i][1], evidenceQuote: specs[i][2], reason: "r", toRecover: "t" })),
    presentationTips: [],
  };
  const caller: ModelCaller = async () => ({ data: out, model: "mock" });
  return evaluate({ rubric: r, answer, callModel: aiUsed ? caller : undefined });
};

describe("compareResults", () => {
  it("classifies each transition from the validated results and attributes quotes to the right attempt", async () => {
    const first = await run(A1, [
      ["correct_complete", 1, "on the going concern basis"], // covered -> kept
      ["correct_incomplete", 0.5, "The company has heavy losses"], // partial -> covered
      ["not_addressed", 0, ""], // missed -> covered
      ["not_addressed", 0, ""], // missed -> still missing
      ["correct_complete", 1, "The auditor should check it"], // covered -> contradicted (worse)
    ]);
    const second = await run(A2, [
      ["correct_complete", 1, "going concern basis for twelve months"],
      ["correct_complete", 1, "Net current liabilities and loan defaults cast doubt"],
      ["correct_complete", 1, "evaluates management's plans and cash flow forecasts"],
      ["not_addressed", 0, ""],
      ["incorrect", 0, "give a clean opinion in all cases"],
    ]);
    const c = compareResults(first, second);
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    expect(c.rows.map((r) => r.change)).toEqual(["kept", "newly-covered", "newly-covered", "still-missing", "worse"]);
    expect(c.rows[1].before.outcome).toBe("partial");
    expect(c.rows[4].after.outcome).toBe("contradicted");
    // quotes come from each attempt's own answer
    expect(A1).toContain(c.rows[1].before.quote!);
    expect(A2).toContain(c.rows[1].after.quote!);
    expect(c.rows[2].before.quote).toBeNull();
    expect(c.marksBefore).toBe(2.5);
    expect(c.marksAfter).toBe(3);
    expect(c.delta).toBe(0.5);
    expect(c.direction).toBe("up");
  });

  it("reports a missed point that became partial as improved, not covered", async () => {
    const base: Spec[] = rubric.points.map(() => ["not_addressed", 0, ""]);
    const first = await run(A1, base);
    const second = await run(A2, [["correct_incomplete", 0.5, "Net current liabilities"], ...base.slice(1)]);
    const c = compareResults(first, second);
    expect(c.ok && c.rows[0].change).toBe("improved");
  });

  it("reports a lower score honestly", async () => {
    const all = (s: Status, m: number, q: string): Spec[] => rubric.points.map(() => [s, m, q]);
    const first = await run(A1, all("correct_complete", 1, "going concern basis"));
    const second = await run(A2, all("not_addressed", 0, ""));
    const c = compareResults(first, second);
    expect(c.ok && c.direction).toBe("down");
    expect(c.ok && c.delta).toBe(-5);
    expect(c.ok && c.groups.worse.length).toBe(5);
  });

  it("reports an unchanged score as the same", async () => {
    const specs: Spec[] = rubric.points.map(() => ["not_addressed", 0, ""]);
    const c = compareResults(await run(A1, specs), await run(A2 + " Extra words that add length only.", specs));
    expect(c.ok && c.direction).toBe("same");
    expect(c.ok && c.delta).toBe(0);
    expect(c.ok && c.groups["still-missing"].length).toBe(5);
  });

  it("never claims a change for a point held for review, and never shows its unverified quote", async () => {
    const specs: Spec[] = rubric.points.map(() => ["not_addressed", 0, ""]);
    const second = await run(A2, [["correct_complete", 1, "words that are not in the answer"], ...specs.slice(1)]);
    const c = compareResults(await run(A1, specs), second);
    expect(c.ok && c.rows[0].change).toBe("unclear");
    expect(c.ok && c.rows[0].after.quote).toBeNull();
  });

  it("refuses to compare attempts on different questions or rubric versions", async () => {
    const specs: Spec[] = rubric.points.map(() => ["not_addressed", 0, ""]);
    const a = await run(A1, specs);
    const b = await run(A2, other.points.map(() => ["not_addressed", 0, ""]), other);
    expect(compareResults(a, b)).toEqual({ ok: false, reason: expect.stringMatching(/different questions/) });
    const bumped = { ...(await run(A2, specs)), rubricVersion: "2" };
    expect(compareResults(a, bumped).ok).toBe(false);
  });

  it("refuses when the same point ids carry different mark allocations (e.g. an edited custom scheme)", async () => {
    const specs: Spec[] = rubric.points.map(() => ["not_addressed", 0, ""]);
    const a = await run(A1, specs);
    const b = await run(A2, specs);
    b.points = b.points.map((p, i) => (i === 0 ? { ...p, allocated: 2 } : p));
    expect(compareResults(a, b).ok).toBe(false);
  });

  it("flags when the two attempts were marked by different markers", async () => {
    const specs: Spec[] = rubric.points.map(() => ["not_addressed", 0, ""]);
    const c = compareResults(await run(A1, specs), await run(A2, specs, rubric, false));
    expect(c.ok && c.mixedMarkers).toBe(true);
  });
});
