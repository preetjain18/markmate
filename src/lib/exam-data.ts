import fs from "node:fs";
import path from "node:path";
import { ExamInsightsSchema, type ExamInsights } from "./exam";

/** Reads data/exam-insights.json (server only). Fails loudly if a record lacks its source. */
export function loadExamInsights(): ExamInsights {
  return ExamInsightsSchema.parse(JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "exam-insights.json"), "utf8")));
}
