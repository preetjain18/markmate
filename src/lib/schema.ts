import { z } from "zod";

export const STATUSES = [
  "correct_complete",
  "correct_incomplete",
  "incorrect",
  "not_addressed",
  "uncertain",
] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  correct_complete: "Correct and complete",
  correct_incomplete: "Correct but incomplete",
  incorrect: "Incorrect or contradictory",
  not_addressed: "Not addressed",
  uncertain: "Uncertain (needs review)",
};

export const RubricPointSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  marks: z.number().positive(),
  description: z.string().min(1),
  keywords: z.array(z.string()).default([]),
  references: z.array(z.string()).default([]),
  /** The provision or principle this point rests on, e.g. "Indian Contract Act, 1872, Section 10". */
  basis: z.string().optional(),
});

export const RubricSchema = z
  .object({
    id: z.string().min(1),
    version: z.string().min(1),
    sa: z.string(),
    topic: z.string(),
    question: z.string().min(1),
    maxMarks: z.number().positive(),
    verified: z.boolean(),
    custom: z.boolean().optional(),
    points: z.array(RubricPointSchema).min(1),
    keywords: z.array(z.string()).default([]),
    references: z.array(z.string()).default([]),
    /** The laws, standards or principles the marking scheme is based on. */
    sources: z.array(z.string()).default([]),
  })
  .refine(
    (r) => Math.abs(r.points.reduce((s, p) => s + p.marks, 0) - r.maxMarks) < 1e-9,
    { message: "Marking point marks must add up to the total marks." },
  );
export type Rubric = z.infer<typeof RubricSchema>;
export type RubricPoint = z.infer<typeof RubricPointSchema>;

/** What the model is allowed to return. Everything else is decided by code. */
export const ModelOutputSchema = z.object({
  points: z.array(
    z.object({
      pointId: z.string(),
      status: z.enum(STATUSES),
      marks: z.number(),
      evidenceQuote: z.string(),
      reason: z.string(),
      toRecover: z.string(),
    }),
  ),
  presentationTips: z.array(z.string()),
});
export type ModelOutput = z.infer<typeof ModelOutputSchema>;

export const MODEL_OUTPUT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["points", "presentationTips"],
  properties: {
    points: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["pointId", "status", "marks", "evidenceQuote", "reason", "toRecover"],
        properties: {
          pointId: { type: "string" },
          status: { type: "string", enum: [...STATUSES] },
          marks: { type: "number" },
          evidenceQuote: { type: "string" },
          reason: { type: "string" },
          toRecover: { type: "string" },
        },
      },
    },
    presentationTips: { type: "array", items: { type: "string" } },
  },
} as const;

export const RubricDraftSchema = z.object({
  points: z
    .array(
      z.object({
        label: z.string(),
        marks: z.number(),
        description: z.string(),
        keywords: z.array(z.string()),
        references: z.array(z.string()),
      }),
    )
    .min(1),
});
export type RubricDraft = z.infer<typeof RubricDraftSchema>;

export const RUBRIC_DRAFT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["points"],
  properties: {
    points: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "marks", "description", "keywords", "references"],
        properties: {
          label: { type: "string" },
          marks: { type: "number" },
          description: { type: "string" },
          keywords: { type: "array", items: { type: "string" } },
          references: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
} as const;

export type PointResult = {
  pointId: string;
  label: string;
  /** What a complete answer to this point covers, copied from the rubric (reference text, not the student's words). */
  requirement: string;
  /** The provision or principle the point rests on, from the rubric, when it names one. */
  basis?: string;
  allocated: number;
  aiStatus: Status;
  aiMarks: number;
  evidenceQuote: string;
  evidenceVerified: boolean;
  needsReview: boolean;
  reviewReason: string;
  reason: string;
  toRecover: string;
};

export type PointChange = { pointId: string; label: string; from: number; to: number; allocated: number };

export type Comparison = {
  recovered: PointChange[];
  improved: PointChange[];
  lost: PointChange[];
  stillMissing: PointChange[];
  marksBefore: number;
  marksAfter: number;
  summary: string;
};

export type AttemptResult = {
  attemptId: string;
  rubricId: string;
  rubricVersion: string;
  verified: boolean;
  maxMarks: number;
  /** The laws or standards the marking scheme is based on. */
  sources?: string[];
  estimatedMarks: number;
  pendingReviewMarks: number;
  needsReview: boolean;
  points: PointResult[];
  missingReferences: string[];
  missingKeywords: string[];
  presentationTips: string[];
  model: string;
  /** True when Gemini judged the points; false when the local rule-based marker did. */
  aiUsed: boolean;
  /** Why the AI was skipped, when it was configured but failed. */
  aiError?: string;
  createdAt: string;
  comparison?: Comparison;
};

/** The slice of an earlier attempt the client sends back for comparison. */
export const PreviousAttemptSchema = z.object({
  rubricId: z.string(),
  rubricVersion: z.string(),
  estimatedMarks: z.number(),
  points: z.array(
    z.object({
      pointId: z.string(),
      label: z.string(),
      allocated: z.number(),
      aiMarks: z.number(),
    }),
  ),
});
export type PreviousAttempt = z.infer<typeof PreviousAttemptSchema>;
