/**
 * Shapes of the practice catalog as the browser sees it (no file access here, safe for client code).
 * Hierarchy: Level → Subject → Chapter → Topic → Question.
 */

/** How far evaluation is supported for a question: a CA-verified rubric, a draft rubric, or none yet. */
export type EvalSupport = "verified" | "unverified" | "none";

/** What a subject offers today, worked out from its questions and rubrics. */
export type SubjectStatus = "verified" | "evaluation" | "practice" | "coming-soon";

export type QuestionView = {
  id: string;
  title: string;
  text: string;
  maxMarks: number | null;
  support: EvalSupport;
  levelId: string;
  subjectId: string;
  chapterId: string;
  topicId: string | null;
};

export type TopicView = { id: string; name: string; count: number };
export type ChapterView = { id: string; name: string; note?: string; topics: TopicView[]; count: number };
export type SubjectStats = { questions: number; evaluable: number; verified: number };
export type SubjectView = {
  id: string;
  name: string;
  short?: string;
  paper?: string;
  category: string;
  chapterNote?: string;
  chapters: ChapterView[];
  stats: SubjectStats;
  status: SubjectStatus;
};
export type LevelView = { id: string; name: string; subjects: SubjectView[] };
export type CatalogView = { source: string; levels: LevelView[]; questions: QuestionView[] };

export function subjectStatus(s: SubjectStats): SubjectStatus {
  if (s.verified > 0) return "verified";
  if (s.evaluable > 0) return "evaluation";
  if (s.questions > 0) return "practice";
  return "coming-soon";
}

export const STATUS_TEXT: Record<SubjectStatus, { label: string; detail: string }> = {
  verified: { label: "Verified rubrics", detail: "Some questions have rubrics checked by a CA." },
  evaluation: { label: "Evaluation available", detail: "Questions can be evaluated against draft rubrics that are not yet verified by a CA." },
  practice: { label: "Practice only", detail: "Questions are available, but evaluation isn't supported for them yet." },
  "coming-soon": { label: "Coming soon", detail: "No questions have been added for this subject yet." },
};

export const SUPPORT_TEXT: Record<EvalSupport, string> = {
  verified: "Verified rubric",
  unverified: "Unverified rubric",
  none: "Evaluation not available",
};
