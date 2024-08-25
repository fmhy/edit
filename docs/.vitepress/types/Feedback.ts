import z from 'zod'

export const FeedbackSchema = z.object({
  message: z.string().min(5).max(1000),
  type: z.enum(['bug', 'suggestion', 'appreciation', 'other']),
  page: z.string().min(3).max(20),
  // For heading based feedback
  heading: z.string().min(3).max(20).optional()
})

export interface Option {
  label: string
  value: FeedbackType['type']
}

export const feedbackOptions: Option[] = [
  {
    label: '💡 I have a suggestion',
    value: 'suggestion'
  },

  { label: '🐛 I want to report a website bug', value: 'bug' },
  {
    label: '👍 I appreciate the work',
    value: 'appreciation'
  },
  { label: '📂 Something else', value: 'other' }
]

export function getFeedbackOption(
  value: FeedbackType['type']
): Option | undefined {
  return feedbackOptions.find((option) => option.value === value)
}

export type FeedbackType = z.infer<typeof FeedbackSchema>
