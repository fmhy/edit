import z from "zod";

export const FeedbackSchema = z.object({
  message: z.string().min(5).max(1000),
  type: z.enum(["bug", "suggestion", "appreciate", "other"]),
  contact: z.string().min(5).max(20).optional(),
  page: z.string().min(3).max(10),
});

export type FeedbackType = z.infer<typeof FeedbackSchema>;
