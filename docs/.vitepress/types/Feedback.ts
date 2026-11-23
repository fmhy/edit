/**
 *  Copyright (c) 2025 taskylizard. Apache License 2.0.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import z from 'zod'

/**
 * The `page` field is a route on this site, never a URL. One leading slash,
 * then path characters only: letters, digits, hyphen, underscore, dot, slash.
 * That rejects a scheme (`http:`), a protocol-relative `//`, a query, a hash,
 * whitespace, angle brackets, control characters and anything percent-encoded,
 * so nothing reaching the API can be read as an off-site link or markup.
 */
export const PAGE_ROUTE_MAX_LENGTH = 200

const PAGE_ROUTE_PATTERN = /^\/(?!\/)[a-zA-Z0-9._/-]*$/

export function isPageRoute(value: unknown): value is string {
  if (typeof value !== 'string') return false
  if (value.length < 1 || value.length > PAGE_ROUTE_MAX_LENGTH) return false
  if (value.includes('//')) return false
  // A traversal segment is never a page here, so refuse rather than resolve.
  if (value.split('/').includes('..')) return false
  return PAGE_ROUTE_PATTERN.test(value)
}

export const FeedbackSchema = z.object({
  message: z.string().min(5).max(1000),
  type: z.enum(['suggestion', 'appreciation', 'other']),
  // Widened from 3-25 characters of [a-zA-Z0-9-/]: real routes such as
  // /social-media-tools or a deep path ran past 25 and were refused.
  page: z
    .string()
    .min(1)
    .max(PAGE_ROUTE_MAX_LENGTH)
    .refine(isPageRoute, 'Invalid page path: expected a /route, not a URL'),
  // For heading based feedback
  heading: z.string().min(3).max(99).optional(),
  contact: z.string().max(100).optional()
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
