import z from 'zod'

// FeedbackSchema is an object schema for validating feedback objects.
// It validates that the 'message' field is a string with a minimum length of 5 and a maximum length of 1000,
// and that the 'type' field is one of the following string values: 'bug', 'suggestion', 'appreciate', 'other'.
// The 'page' field is optional.
export const FeedbackSchema = z.object({
  message: z.string().min(5).max(1000),
  type: z.enum(['bug', 'suggestion', 'appreciate', 'other']),
  page: z.string().optional()
})

// feedbackOptions is an array of objects that define the possible options for the 'type' field of a feedback object.
// Each object has a 'label' field for displaying a human-readable label for the option,
// and a 'value' field for the corresponding string value that should be used for validation.
export const feedbackOptions = [
  { label: '🐞 Bug', value: 'bug' },
  { label: '💡 Suggestion', value: 'suggestion' },
  { label: '📂 Other', value: 'other' },
  { label: '❤️ Appreciation', value: 'appreciate' }
]

// getFeedbackOption is a function that takes a string value and returns the corresponding feedback option object.
// If no matching option is found, the function returns undefined.
export function getFeedbackOption(value: string): { label: string; value: string } | undefined {
  return feedbackOptions.find((option) => option.value === value)
}

// FeedbackType is a type alias for the inferred type of the FeedbackSchema object.
// It represents the shape of a valid feedback object.
export type FeedbackType = z.infer<typeof FeedbackSchema>
