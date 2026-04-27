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

import type { DefaultTheme } from 'vitepress'
import { excluded } from './shared'
import { transform, transformGuide } from './transformer'

// @unocss-include

<<<<<<< HEAD
export const meta = {
  name: 'Kugelstadt',
  description: 'Copy of fmhy.net!',
  hostname: 'https://fmhy.kugelstadt.cc',
  keywords: ['stream', 'movies', 'gaming', 'reading', 'anime'],
  build: {
    api: true,
    nsfw: true
  }
}

export const excluded = [
  'readme.md',
  'single-page',
  'feedback.md',
  'index.md',
  'sandbox.md',
  'startpage.md'
]

if (process.env.FMHY_BUILD_NSFW === 'false') {
  consola.info('FMHY_BUILD_NSFW is set to false, disabling NSFW content')
  meta.build.nsfw = false
}
if (process.env.FMHY_BUILD_API === 'false') {
  consola.info('FMHY_BUILD_API is set to false, disabling API component')
  meta.build.api = false
}

const formatCommitRef = (commitRef: string) =>
  `<a href="https://github.com/fmhy/edit/commit/${commitRef}">${commitRef.slice(0, 8)}</a>`

export const commitRef =
  process.env.CF_PAGES && process.env.CF_PAGES_COMMIT_SHA
    ? formatCommitRef(process.env.CF_PAGES_COMMIT_SHA)
    : process.env.COMMIT_REF
      ? formatCommitRef(process.env.COMMIT_REF)
      : 'dev'

export const feedback = `<a href="/feedback" class="feedback-footer">Made with ❤</a>`
=======
export * from './shared'
>>>>>>> show page title in search (#4643)

export const search: DefaultTheme.Config['search'] = {
  options: {
    _render(src, env, md) {
      // Check if current file should be excluded from search
      const relativePath = env.relativePath || env.path || ''
      const shouldExclude = excluded.some(excludedFile =>
        relativePath.includes(excludedFile) ||
        relativePath.endsWith(excludedFile)
      )

      // Return empty content for excluded files so they don't appear in search
      if (shouldExclude) {
        return ''
      }

      let contents = src
      // I do this as env.frontmatter is not available until I call `md.render`
      if (contents.includes('Beginners Guide'))
        contents = transformGuide(contents)
      contents = transform(contents)
      const html = md.render(contents, env)
      return html
    },
    miniSearch: {
      options: {
        tokenize: (text) => text.replace(/[\u2060\u200B]/g, '').split(/[\n\r #%*,=/:;?[\]{}()&]+/u), // simplified charset: removed [-_.@] and non-english chars (diacritics etc.)
        processTerm: (term, fieldName) => {
          // biome-ignore lint/style/noParameterAssign: h
          term = term
            .trim()
            .toLowerCase()
            .replace(/^\.+/, '')
            .replace(/\.+$/, '')
          const stopWords = [
            'frontmatter',
            '$frontmatter.synopsis',
            'and',
            'about',
            'but',
            'now',
            'the',
            'with',
            'you'
          ]
          if (term.length < 2 || stopWords.includes(term)) return false

          if (fieldName === 'text') {
            const parts = term.split('.')
            if (parts.length > 1) {
              const newTerms = [term, ...parts]
                .filter((t) => t.length >= 2)
                .filter((t) => !stopWords.includes(t))
              return newTerms
            }
          }
          return term
        }
      },
      searchOptions: {
        combineWith: 'AND',
        fuzzy: false,
        // @ts-ignore
        boostDocument: (documentId, term, storedFields: Record) => {
          const titles = (storedFields?.titles as string[])
            .filter((t) => Boolean(t))
            .map((t) => t.toLowerCase())
          // Downrank posts
          if (documentId.match(/\/posts/)) return -5
          // Downrank /other
          if (documentId.match(/\/other/)) return -5

          // Uprate if term appears in titles. Add bonus for higher levels (i.e. lower index)
          const titleIndex =
            titles
              .map((t, i) => (t?.includes(term) ? i : -1))
              .find((i) => i >= 0) ?? -1
          if (titleIndex >= 0) return 10000 - titleIndex

          return 1
        }
      }
    },
    detailedView: true
  },
  provider: 'local'
}
