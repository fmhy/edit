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
import path from 'node:path'
import MiniSearch from 'minisearch'
import { excluded } from './shared'
import { transform, transformGuide } from './transformer'

// @unocss-include

export * from './shared'

// l = regular (or bold-only) hyperlinks, s = bold + starred (curated picks).
// Bold-without-star is just an index label, no special ranking – folded into l.
const globalLinkMetadata: Record<string, { l: string[]; s: string[] }> = {}

// Inject customMetadata into the serialized MiniSearch index so the client
// can read it back via MiniSearch.loadJS.  This patches the prototype because
// VitePress controls serialization internally — there's no cleaner hook.
// If MiniSearch ever drops toJSON, the build will still work; the metadata
// just won't be attached (and the client already falls back to {}).
const originalToJSON = MiniSearch.prototype.toJSON
if (typeof originalToJSON === 'function') {
  MiniSearch.prototype.toJSON = function () {
    const json = originalToJSON.call(this)
    if (json && typeof json === 'object') {
      ;(json as Record<string, unknown>).customMetadata = globalLinkMetadata
    }
    return json
  }
}

function getDocId(file: string) {
  const srcDir = path.resolve(__dirname, '..')
  const relFile = path.relative(srcDir, file).replace(/\\/g, '/')
  let id = '/' + relFile
  id = id.replace(/(^|\/)index\.md$/, '$1')
  id = id.replace(/\.md$/, '')
  return id
}

function extractLinkMetadata(html: string) {
  const links = new Set<string>()
  const starredBoldLinks = new Set<string>()
  const stripTags = (str: string) => str.replace(/<[^>]*>/g, ' ')
  // Strip zero-width / word-joiner chars. The FMHY wiki sprinkles U+2060 (and
  // occasionally U+200B) inside link text as a visual workaround; leaving them
  // in metadata phrases breaks exact/prefix tier matching at search time.
  const stripInvisible = (str: string) =>
    str.replace(/\u2060|\u200B|\u200C|\u200D|\uFEFF/g, '')
  const cleanText = (text: string) =>
    stripInvisible(stripTags(text)).replace(/\s+/g, ' ').trim().toLowerCase()

  const isStarred = (index: number) => {
    // `<li ` and `<li>` rather than `<li` so we don't catch `<link>` / `<line>`.
    const liSpace = html.lastIndexOf('<li ', index)
    const liGt = html.lastIndexOf('<li>', index)
    const prefixIndex = Math.max(liSpace, liGt)
    const prefixText =
      prefixIndex !== -1
        ? html.substring(prefixIndex, index)
        : html.substring(Math.max(0, index - 50), index)
    return (
      prefixText.includes('starred') ||
      prefixText.includes('⭐') ||
      prefixText.includes('🌟')
    )
  }

  const boldRegex =
    /<strong\b[^>]*>([\s\S]*?)<\/strong>|<b\b[^>]*>([\s\S]*?)<\/b>/i

  // 1. Process <a> tags – starred-bold goes to s, everything else to l.
  const aTagRegex = /<a\b[^>]*>([\s\S]*?)<\/a>/gi
  let match: RegExpExecArray | null
  while ((match = aTagRegex.exec(html)) !== null) {
    const innerHtml = match[1]
    const cleaned = cleanText(innerHtml)
    if (!cleaned) continue
    if (boldRegex.test(innerHtml) && isStarred(match.index)) {
      starredBoldLinks.add(cleaned)
    } else {
      links.add(cleaned)
    }
  }

  // 2. Process <strong>/<b> tags containing <a> tags (covers **[Name](url)**).
  const boldTagRegex = /<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi
  while ((match = boldTagRegex.exec(html)) !== null) {
    const innerHtml = match[2]
    if (/<a\b[^>]*>([\s\S]*?)<\/a>/i.test(innerHtml)) {
      const cleaned = cleanText(innerHtml)
      if (cleaned) {
        if (isStarred(match.index)) {
          starredBoldLinks.add(cleaned)
        } else {
          links.add(cleaned)
        }
      }
    }
  }

  starredBoldLinks.forEach((w) => links.delete(w))

  return {
    links: Array.from(links),
    starredBoldLinks: Array.from(starredBoldLinks)
  }
}

// Remove note/infobox custom blocks from the search HTML, depth-counting <div>
// tags so a block is fully removed even when it nests other <div>s (code fences
// render as <div class="language-*">, wrapped components add their own). A flat
// non-greedy regex would stop at the first inner </div> and leak the note prose.
// Matches any admonition/infobox custom-block opener — :::tip/:::info/:::warning
// /:::danger AND GitHub-style alerts (> [!NOTE] etc.) which render with extra
// classes like `info custom-block github-alert`. Excludes `:::details` (kept
// searchable; it renders as a <details> tag anyway, so this is belt-and-braces).
// The trailing [ "] ensures we match the `custom-block` class token whether it is
// followed by more classes (a space) or the closing quote, but never the
// `custom-block-title` label.
const NOTE_BLOCK_OPEN_RE = /<div class="(?!details )[a-z-]+ custom-block[ "]/i
const DIV_TAG_RE = /<div\b[^>]*?(\/?)>|<\/div>/gi
function stripNoteBlocks(html: string): string {
  let out = ''
  let cursor = 0 // start of the not-yet-emitted slice
  let depth = 0 // nesting depth of open <div>s
  let noteDepth = -1 // depth at which the active note block opened (-1 = none)
  let match: RegExpExecArray | null
  DIV_TAG_RE.lastIndex = 0
  while ((match = DIV_TAG_RE.exec(html)) !== null) {
    const isClose = match[0].startsWith('</')
    const isSelfClosing = !isClose && match[1] === '/'
    if (isClose) {
      depth--
      if (noteDepth !== -1 && depth === noteDepth) {
        // matching close for the active note block: drop everything inside it
        cursor = DIV_TAG_RE.lastIndex
        noteDepth = -1
      }
    } else if (!isSelfClosing) {
      if (noteDepth === -1 && NOTE_BLOCK_OPEN_RE.test(match[0])) {
        out += html.slice(cursor, match.index) // flush text before the note
        noteDepth = depth
      }
      depth++
    }
  }
  // Emit the trailing slice only when not inside an unterminated note block;
  // otherwise malformed/unbalanced HTML (a note <div> that never closes) would
  // re-emit the note prose we meant to drop. VitePress output is balanced, so
  // this is defensive only.
  if (noteDepth === -1) out += html.slice(cursor)
  return out
}

export const search: DefaultTheme.Config['search'] = {
  options: {
    _render(src, env, md) {
      // Check if current file should be excluded from search
      const relativePath = env.relativePath || env.path || ''
      const shouldExclude = excluded.some(
        (excludedFile) =>
          relativePath.includes(excludedFile) ||
          relativePath.endsWith(excludedFile)
      )

      // Return empty content for excluded files so they don't appear in search
      if (shouldExclude) {
        return ''
      }

      // Exclude posts older than 2 months (60 days)
      if (relativePath.includes('posts/')) {
        const frontmatterMatch = src.match(/^---\r?\n([\s\S]*?)\r?\n---/)
        if (frontmatterMatch) {
          const dateMatch = frontmatterMatch[1].match(
            /^date:\s*['"]?([\d-]+)['"]?/m
          )
          if (dateMatch) {
            const postDate = new Date(dateMatch[1])
            const twoMonthsAgo = new Date()
            twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
            if (postDate < twoMonthsAgo) {
              return ''
            }
          }
        }
      }

      let contents = src

      //Strip any content wrapped in <!-- search-exclude --> tags
      contents = contents.replace(
        /<!--\s*search-exclude\s*-->[\s\S]*?<!--\s*\/search-exclude\s*-->/gi,
        ''
      )

      const isPostOrOther =
        relativePath.includes('posts') || relativePath.includes('other')

      if (!isPostOrOther) {
        // I do this as env.frontmatter is not available until I call `md.render`
        if (contents.includes('Beginners Guide'))
          contents = transformGuide(contents)

        contents = transform(contents)
      }
      let html = md.render(contents, env)
      // Strip <Tooltip ...>...</Tooltip> contents to avoid indexing hidden notes in search
      html = html.replace(/<Tooltip[\s\S]*?<\/Tooltip>/gi, '')
      // Strip note/infobox custom blocks (:::tip/:::info/:::warning/:::danger,
      // also produced by **Note**/**Warning**/!!!note) so their prose doesn't get
      // indexed. Otherwise a note mentioning e.g. "uBlock Origin" outranks (and
      // hijacks the excerpt of) the real curated link. Runs before
      // _splitIntoSections so links living only inside a note aren't registered
      // as curated either. Nesting-aware so a note containing a code fence or
      // wrapped component (which render as nested <div>s) is still fully removed.
      html = stripNoteBlocks(html)
      return html
    },
    miniSearch: {
      _splitIntoSections(file: string, html: string) {
        const fileId = getDocId(file)
        // Drop any stale metadata for this file before re-populating so HMR
        // edits don't leave behind links that no longer exist.
        const filePrefix = fileId + '#'
        for (const key of Object.keys(globalLinkMetadata)) {
          if (key === fileId || key.startsWith(filePrefix)) {
            delete globalLinkMetadata[key]
          }
        }
        const sections: any[] = []

        const headingRegex =
          /<h(\d*).*?>(.*?<a.*? href="#.*?".*?>.*?<\/a>)<\/h\1>/gi
        const headingContentRegex = /(.*?)<a.*? href="#(.*?)".*?>.*?<\/a>/i

        const clearHtmlTags = (str: string) => str.replace(/<[^>]*>/g, '')
        const getSearchableText = (content: string) => clearHtmlTags(content)

        const result = html.split(headingRegex)
        result.shift()
        let parentTitles: string[] = []

        for (let i = 0; i < result.length; i += 3) {
          const level = parseInt(result[i]) - 1
          const heading = result[i + 1]
          const headingResult = headingContentRegex.exec(heading)
          const title = clearHtmlTags(headingResult?.[1] ?? '').trim()
          const anchor = headingResult?.[2] ?? ''
          const content = result[i + 2]
          if (!title || !content) continue
          let titles = parentTitles.slice(0, level)
          titles[level] = title
          titles = titles.filter(Boolean)

          const sectionId = anchor ? `${fileId}#${anchor}` : fileId

          const { links, starredBoldLinks } = extractLinkMetadata(content)
          if (links.length > 0 || starredBoldLinks.length > 0) {
            globalLinkMetadata[sectionId] = {
              l: links,
              s: starredBoldLinks
            }
          }

          sections.push({
            anchor,
            titles,
            text: getSearchableText(content)
          })

          if (level === 0) {
            parentTitles = [title]
          } else {
            parentTitles[level] = title
          }
        }
        return sections
      },
      // \u26A0 tokenize + processTerm are duplicated in VPLocalSearchBox.vue's
      // tokenizeIndexLike().  If you change the split regex, stop words, or
      // min-length here, update the copy there too \u2014 search ranking breaks
      // silently when they disagree.
      options: {
        tokenize: (text: string) =>
          text
            .replace(/\u2060|\u200B|\u200C|\u200D|\uFEFF/g, '')
            .split(/[\n\r #%*,=/:;?[\]{}()&]+/u),
        processTerm: (term: string, fieldName?: string): any => {
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
        boostDocument: (
          documentId: string,
          term: string,
          storedFields?: Record<string, unknown>
        ) => {
          const titles = ((storedFields?.titles as string[]) || [])
            .filter((t) => Boolean(t))
            .map((t) => t.toLowerCase())

          let boost = 1

          // Uprate if term appears in titles. Add bonus for higher levels (i.e. lower index)
          const titleIndex =
            titles
              .map((t, i) => (t?.includes(term) ? i : -1))
              .find((i) => i >= 0) ?? -1
          if (titleIndex >= 0) {
            boost = 10000 - titleIndex
          }

          // Downrank posts and other pages
          if (documentId.match(/\/posts/)) {
            boost *= 0.1
          } else if (documentId.match(/\/other/)) {
            boost *= 0.1
          }

          return boost
        }
      }
    } as any,
    detailedView: true
  },
  provider: 'local'
}
