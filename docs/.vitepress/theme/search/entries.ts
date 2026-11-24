// Matches a search query to the curated list entries (top-level list items whose
// first link is the tool's name) of a section result.

const INVISIBLE_CHARS_RE = /\u2060|\u200B|\u200C|\u200D|\uFEFF/g
const ENTRY_WORD_SPLIT_RE = /[^\p{L}\p{N}]+/u

function entryWords(text: string) {
  return text
    .replace(INVISIBLE_CHARS_RE, '')
    .toLowerCase()
    .split(ENTRY_WORD_SPLIT_RE)
    .filter(Boolean)
}

function indexOfRun(words: string[], run: string[]) {
  for (let i = 0; i + run.length <= words.length; i++) {
    if (run.every((w, j) => words[i + j] === w)) return i
  }
  return -1
}

// How well a curated entry's name matches a query: 4 = the whole name,
// 3 = its leading words, 2 = whole words inside it, 1 = one word, 0 = none.
export function entryNameRank(name: string, query: string): number {
  const nameWords = entryWords(name)
  const queryWords = entryWords(query)
  if (!nameWords.length || !queryWords.length) return 0
  if (nameWords.join('') === queryWords.join('')) return 4
  const at = indexOfRun(nameWords, queryWords)
  if (at === 0) return 3
  if (at > 0) return 2
  return queryWords.some((w) => nameWords.includes(w)) ? 1 : 0
}

export interface EntryCandidate {
  name: string
  starred: boolean
}

// The list entry a section result is about: best name match for the query,
// then for the index terms it matched (typos, prefixes), starred, page order.
export function pickEntry(
  entries: EntryCandidate[],
  query: string,
  matchedTerms: string[]
): number {
  let best = -1
  let bestKey = 0
  entries.forEach((entry, i) => {
    const queryRank = entryNameRank(entry.name, query)
    const termRank = Math.max(
      0,
      ...matchedTerms.map((t) => entryNameRank(entry.name, t))
    )
    if (!queryRank && !termRank) return
    const key = queryRank * 10 + termRank * 2 + (entry.starred ? 1 : 0)
    if (key > bestKey) {
      best = i
      bestKey = key
    }
  })
  return best
}
