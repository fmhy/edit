import { useLocalStorage } from '@vueuse/core'
import { normalizeBookmarkUrl, normalizePagePath } from './savedRowUtils'

export type SavedBookmark = {
  url: string
  page: string
  savedAt: number
  html?: string
  classes?: string
}

const STORAGE_KEY = 'fmhy-saved-links'

const bookmarks = useLocalStorage<SavedBookmark[]>(STORAGE_KEY, [])

function migrateLegacy(
  entry: SavedBookmark & {
    title?: string
    section?: string
  }
): SavedBookmark {
  const migrated: SavedBookmark = {
    url: normalizeBookmarkUrl(entry.url),
    page: normalizePagePath(entry.page),
    savedAt: entry.savedAt
  }

  if (entry.html) {
    migrated.html = entry.html
    migrated.classes = entry.classes || ''
  } else if (entry.title) {
    const title = entry.title || migrated.url
    migrated.html = `<strong><a href="${migrated.url}">${title}</a></strong>`
    migrated.classes = entry.classes || ''
  }

  return migrated
}

export function useLinkBookmarks() {
  const rows = bookmarks

  const normalized = () => rows.value.map((entry) => migrateLegacy(entry))

  const isBookmarked = (url: string) => {
    const target = normalizeBookmarkUrl(url)
    return normalized().some(
      (entry) => normalizeBookmarkUrl(entry.url) === target
    )
  }

  const toggle = (bookmark: Omit<SavedBookmark, 'savedAt'>) => {
    const url = normalizeBookmarkUrl(bookmark.url)
    const page = normalizePagePath(bookmark.page)
    const index = rows.value.findIndex(
      (entry) => normalizeBookmarkUrl(entry.url) === url
    )
    if (index >= 0) {
      rows.value.splice(index, 1)
      return false
    }

    rows.value.push({ ...bookmark, url, page, savedAt: Date.now() })
    return true
  }

  const remove = (url: string) => {
    const target = normalizeBookmarkUrl(url)
    const index = rows.value.findIndex(
      (entry) => normalizeBookmarkUrl(entry.url) === target
    )
    if (index >= 0) rows.value.splice(index, 1)
  }

  const updateSnapshot = (
    url: string,
    snapshot: Pick<SavedBookmark, 'html' | 'classes'>
  ) => {
    const target = normalizeBookmarkUrl(url)
    const index = rows.value.findIndex(
      (entry) => normalizeBookmarkUrl(entry.url) === target
    )
    if (index < 0 || !snapshot.html) return

    rows.value[index] = {
      ...rows.value[index],
      html: snapshot.html,
      classes: snapshot.classes || ''
    }
  }

  return {
    bookmarks: rows,
    normalized,
    isBookmarked,
    toggle,
    remove,
    updateSnapshot
  }
}
