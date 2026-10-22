/**
 * The practice catalog: Level → Subject → Chapter → Topic → Question.
 *
 * - data/catalog.json describes the hierarchy and lists question ids under each topic.
 * - Questions with an evaluation rubric live in data/rubrics/*.json (unchanged; the rubric *is* the question record).
 * - Questions without a rubric yet can live in data/questions/*.json ({ id, question, maxMarks? }); they are
 *   practice-only and are never sent for evaluation.
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  subjectStatus,
  type CatalogView,
  type ChapterView,
  type EvalSupport,
  type QuestionView,
  type SubjectView,
} from "./catalog-types";
import { loadRubrics } from "./rubrics";
import type { Rubric } from "./schema";

const TopicSchema = z.object({ id: z.string(), name: z.string(), questions: z.array(z.string()).default([]) });
const ChapterSchema = z.object({ id: z.string(), name: z.string(), note: z.string().optional(), topics: z.array(TopicSchema).default([]) });
const SubjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  short: z.string().optional(),
  paper: z.string().optional(),
  category: z.string(),
  chapterNote: z.string().optional(),
  chapters: z.array(ChapterSchema).default([]),
});
const LevelSchema = z.object({ id: z.string(), name: z.string(), subjects: z.array(SubjectSchema) });
export const CatalogFileSchema = z.object({ source: z.string(), levels: z.array(LevelSchema) });
export type CatalogFile = z.infer<typeof CatalogFileSchema>;

export const PlainQuestionSchema = z.object({ id: z.string(), question: z.string().min(1), maxMarks: z.number().positive().optional() });
export type PlainQuestion = z.infer<typeof PlainQuestionSchema>;

export type Catalog = { view: CatalogView; rubrics: Map<string, Rubric> };

const support = (r: Rubric | undefined): EvalSupport => (!r ? "none" : r.verified ? "verified" : "unverified");

/** Pure: builds the browsable catalog from its three data sources. Throws if the catalog points at a missing question. */
export function buildCatalog(file: CatalogFile, rubricList: Rubric[], plain: PlainQuestion[] = []): Catalog {
  const rubrics = new Map(rubricList.map((r) => [r.id, r]));
  const plainById = new Map(plain.map((q) => [q.id, q]));
  const questions: QuestionView[] = [];
  const seen = new Set<string>();

  const levels = file.levels.map((level) => ({
    id: level.id,
    name: level.name,
    subjects: level.subjects.map((subject): SubjectView => {
      const chapters = subject.chapters.map((chapter): ChapterView => {
        const topics = chapter.topics.map((topic) => {
          for (const qid of topic.questions) {
            if (seen.has(qid)) throw new Error(`Question ${qid} is listed more than once in the catalog.`);
            seen.add(qid);
            const r = rubrics.get(qid);
            const p = plainById.get(qid);
            if (!r && !p) throw new Error(`Catalog lists question ${qid}, but no rubric or question file has that id.`);
            questions.push({
              id: qid,
              title: topic.name,
              text: r ? r.question : p!.question,
              maxMarks: r ? r.maxMarks : (p!.maxMarks ?? null),
              support: support(r),
              levelId: level.id,
              subjectId: subject.id,
              chapterId: chapter.id,
              topicId: topic.id,
            });
          }
          return { id: topic.id, name: topic.name, count: topic.questions.length };
        });
        return { id: chapter.id, name: chapter.name, note: chapter.note, topics, count: topics.reduce((s, t) => s + t.count, 0) };
      });
      const own = questions.filter((q) => q.subjectId === subject.id);
      const stats = {
        questions: own.length,
        evaluable: own.filter((q) => q.support !== "none").length,
        verified: own.filter((q) => q.support === "verified").length,
      };
      return { ...subject, chapters, stats, status: subjectStatus(stats) };
    }),
  }));

  return { view: { source: file.source, levels, questions }, rubrics };
}

const DATA = path.join(process.cwd(), "data");

function readJsonDir<T>(dir: string, schema: z.ZodType<T>): T[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => schema.parse(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))));
}

export function loadCatalog(): Catalog {
  const file = CatalogFileSchema.parse(JSON.parse(fs.readFileSync(path.join(DATA, "catalog.json"), "utf8")));
  return buildCatalog(file, loadRubrics(), readJsonDir(path.join(DATA, "questions"), PlainQuestionSchema));
}

/** What the evaluate API should do with a catalog question id. */
export type Resolution = { kind: "ok"; rubric: Rubric } | { kind: "unsupported" } | { kind: "not-found" };

export function resolveForEvaluation(catalog: Catalog, questionId: string): Resolution {
  const q = catalog.view.questions.find((x) => x.id === questionId);
  if (!q) return { kind: "not-found" };
  const rubric = catalog.rubrics.get(questionId);
  return rubric ? { kind: "ok", rubric } : { kind: "unsupported" };
}
