import { meta } from '../constants'
import headerData from './headers.json'

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
interface Header {
  [file: string]: { title: string; description: string }
}

export const headers: Header = headerData

export const excluded = [
  'readme.md',
  'single-page',
  'feedback.md',
  'index.md',
  'sandbox.md',
  'startpage.md'
]

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function getHeader(id: string) {
  const title = '<div class="fmhy-page-header"><h1>'
  const description = '<p>'
  const feedback = meta.build.api ? '<Feedback />' : ''
  const data = headers[id]

  let header = '---\n'
  header += `title: "${data.title}"\n`
  header += `description: ${data.description}\n`
  if (id === 'recently-removed.md') header += 'editLink: false\noutline: 2\n'
  header += '---\n'
  header += `${title}${escapeHtml(data.title)}</h1>\n`
  header += `${description}${escapeHtml(data.description)}</p></div>\n\n${feedback}\n\n`
  return header
}
