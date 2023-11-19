import z from "zod";

export const FeedbackSchema = z.object({
  message: z.string().min(5).max(1000),
  type: z.enum(["bug", "suggestion", "appreciate", "other"]),
  contact: z.string().optional(),
  page: z.string().min(3).max(10),
});

export const feedbackOptions = [
  { label: "🐞 Bug", value: "bug" },
  {
    label: "💡 Suggestion",
    value: "suggestion",
  },
  { label: "📂 Other", value: "other" },
  {
    label: "❤️ Appreciation",
    value: "appreciate",
  },
];

export function getFeedbackOption(value: string): { label: string; value: string } {
  return feedbackOptions.find((option) => option.value === value);
}

export type FeedbackType = z.infer<typeof FeedbackSchema>;
