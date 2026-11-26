<script setup lang="ts">
import { withBase } from 'vitepress'
import { computed, onMounted, ref, watch } from 'vue'
import { sanitizeRichHtml } from '../composables/sanitize'

// Generated at build time by scripts/generate-removed.js from git history
// and served as a static asset — no external feed.
const FEED_URL = withBase('/changes.json')
const COMMIT_URL = 'https://github.com/fmhy/edit/commit/'
const LAST_VISIT_KEY = 'fmhy-changes-last-visit'

interface ChangeEntry {
  link: string
  source: string
  anchor?: string
  type: 'new' | 'updated'
}

interface Commit {
  sha: string
  date: string
  message: string
  added: ChangeEntry[]
}

interface ChangesFeed {
  days: number
  generatedAt: string | null
  commits: Commit[]
}

interface FlatEntry extends ChangeEntry {
  commit: Commit
}

const loading = ref(true)
const error = ref(false)
const data = ref<ChangesFeed | null>(null)
const filter = ref<'all' | ChangeEntry['type']>('all')
const rawQuery = ref('')
const query = ref('')
const lastVisit = ref(0)
const expandedGroups = ref(new Set<string>())
const expandedCommits = ref(new Set<string>())
const range = ref<'all' | 'w0' | 'w1' | 'w2' | 'w3' | 'custom'>('all')
const rangeFrom = ref('')
const rangeTo = ref('')
const showPicker = ref(false)
const COMMITS_PER_GROUP = 10
const ENTRIES_PER_COMMIT = 15

const weekLabels: Record<string, string> = {
  w0: 'This week',
  w1: 'Last week',
  w2: '2 weeks ago',
  w3: '3 weeks ago'
}
const groupOrder = ['w0', 'w1', 'w2', 'w3']

// Rendering is expensive (sanitize + v-html per row), so keep search input
// snappy by debouncing it, and memoize rendered rows below.
let debounceTimer: ReturnType<typeof setTimeout>
watch(rawQuery, (value) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => (query.value = value), 150)
})

const load = async () => {
  loading.value = true
  error.value = false
  try {
    const res = await fetch(FEED_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    data.value = await res.json()
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

const weekIndex = (iso: string) => {
  const day = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(day.getTime())) return 'w3'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const age = Math.round((today.getTime() - day.getTime()) / 86400000)
  if (age <= 6) return 'w0'
  if (age <= 13) return 'w1'
  if (age <= 20) return 'w2'
  return 'w3'
}

const inRange = (iso: string) => {
  if (range.value === 'all') return true
  if (range.value === 'custom') {
    const t = Date.parse(`${iso}T00:00:00`)
    if (rangeFrom.value && t < Date.parse(`${rangeFrom.value}T00:00:00`))
      return false
    if (rangeTo.value && t > Date.parse(`${rangeTo.value}T00:00:00`))
      return false
    return true
  }
  return weekIndex(iso) === range.value
}

onMounted(() => {
  try {
    lastVisit.value = Number(localStorage.getItem(LAST_VISIT_KEY)) || 0
    localStorage.setItem(LAST_VISIT_KEY, String(Date.now()))
  } catch {
    // localStorage unavailable; skip last-visit tracking
  }
  load()
})

// A resource's identity is its primary URL — the first link before the " - "
// description separator. Description-only links (the shared adblocker/wiki
// links in Note bullets) aren't resources, so those lines key on their text.
// Commits are newest-first, so the first occurrence wins and later ones are
// dropped.
const entryKey = (link: string) => {
  const desc = link.indexOf(' - ')
  const match = link.match(/\]\((https?:\/\/[^\s)]+)\s*\)/)
  if (match && (desc === -1 || match.index! < desc)) return match[1]
  return link.replace(/\s+/g, ' ').trim().toLowerCase()
}

// Dedupe once per data load — independent of the live filters.
const deduped = computed<FlatEntry[]>(() => {
  if (!data.value) return []
  const seen = new Set<string>()
  const out: FlatEntry[] = []
  for (const commit of data.value.commits)
    for (const e of commit.added) {
      const key = entryKey(e.link)
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ ...e, commit })
    }
  return out
})

const counts = computed(() => {
  const c = { new: 0, updated: 0 }
  for (const e of deduped.value) c[e.type]++
  return c
})

const freshCount = computed(() =>
  lastVisit.value
    ? deduped.value.filter(
        (e) => e.type === 'new' && Date.parse(e.commit.date) > lastVisit.value
      ).length
    : 0
)

const groups = computed(() => {
  const q = query.value.trim().toLowerCase()
  const byGroup = new Map<string, { commit: Commit; entries: FlatEntry[] }[]>()

  for (const e of deduped.value) {
    if (
      (filter.value !== 'all' && e.type !== filter.value) ||
      (q && !e.link.toLowerCase().includes(q)) ||
      !inRange(e.commit.date)
    )
      continue
    const group = weekIndex(e.commit.date)
    const list = byGroup.get(group) ?? []
    let bucket = list.find((b) => b.commit === e.commit)
    if (!bucket) {
      bucket = { commit: e.commit, entries: [] }
      list.push(bucket)
    }
    bucket.entries.push(e)
    byGroup.set(group, list)
  }

  return groupOrder
    .filter((g) => byGroup.has(g))
    .map((g) => ({ label: weekLabels[g], commits: byGroup.get(g)! }))
})

interface CommitGroup {
  label: string
  commits: { commit: Commit; entries: FlatEntry[] }[]
}

const visibleCommits = (group: CommitGroup) =>
  expandedGroups.value.has(group.label)
    ? group.commits
    : group.commits.slice(0, COMMITS_PER_GROUP)

const visibleEntries = (bucket: { commit: Commit; entries: FlatEntry[] }) =>
  expandedCommits.value.has(bucket.commit.sha)
    ? bucket.entries
    : bucket.entries.slice(0, ENTRIES_PER_COMMIT)

const escapeHtml = (s: string) =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

// Sources are docs/ paths stripped to page routes, plus the heading slug of
// the entry's section (emitted by the generator): "video", "streaming-sites".
// `hl` tags resource links with the site URL so the target page can flash and
// hold a highlight on the exact line (see composables/highlightLink.ts).
const sourceHref = (source: string, anchor?: string, hl?: string) =>
  withBase(`/${source}`) +
  (hl ? `?hl=${encodeURIComponent(hl)}` : '') +
  (anchor ? `#${anchor}` : '')

// Render one tracker line ("* 🌟 **[Name](url)** or [Alt](url) - desc") as
// sanitized inline HTML: leading bullet stripped, links and bold kept.
// Resource links — every link before the first " - " description separator —
// point at the entry's FMHY section; each gets a ↗ icon for opening the site
// directly. Links inside the description (mirrors, references) stay external.
const LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\s*\)/g

const renderLink = (line: string, source: string, anchor?: string) => {
  const body = escapeHtml(line.replace(/^\s*[*+-]\s+/, ''))
  const descStart = body.indexOf(' - ')
  let first = true
  const html = body
    .replace(LINK_RE, (_match, name: string, url: string, offset: number) => {
      const isResource = descStart === -1 ? first : offset < descStart
      first = false
      const ext = `<a class="entry-ext" href="${url}" target="_blank" rel="noopener noreferrer" title="Open site directly">↗</a>`
      if (!isResource)
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${name}</a>`
      // `body` is HTML-escaped, so & arrives as &amp; — decode for the
      // ?hl= param, which must match the real href on the target page.
      const site = url.replaceAll('&amp;', '&')
      return `<a href="${sourceHref(source, anchor, site)}">${name}</a>${ext}`
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  return sanitizeRichHtml(html)
}

// Memoized per line+section so re-renders after filter changes don't re-run
// markdown transformation and DOMPurify for rows that were already shown.
const htmlCache = new Map<string, string>()
const renderEntry = (e: FlatEntry) => {
  const cacheKey = `${e.source}${e.anchor ?? ''}${e.link}`
  let html = htmlCache.get(cacheKey)
  if (html === undefined) {
    html = renderLink(e.link, e.source, e.anchor)
    if (htmlCache.size >= 20000) htmlCache.clear()
    htmlCache.set(cacheKey, html)
  }
  return html
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  })

const rangeLabel = computed(() => `Last ${data.value?.days ?? 30} days`)

const customRangeLabel = computed(() =>
  range.value === 'custom' && (rangeFrom.value || rangeTo.value)
    ? `${rangeFrom.value || '…'} → ${rangeTo.value || '…'}`
    : '📅 Pick dates'
)

const isFresh = (commit: Commit) => {
  if (!lastVisit.value) return false
  const t = Date.parse(commit.date)
  return t > lastVisit.value && Date.now() - lastVisit.value > 60_000
}
</script>

<template>
  <div class="changes-page">
    <div v-if="data && !loading" class="changes-meta">
      <span class="meta-month">{{ rangeLabel }}</span>
      <span class="meta-count">{{ counts.new }} new</span>
      <span class="meta-count">{{ counts.updated }} updated</span>
      <span v-if="freshCount" class="meta-fresh">
        {{ freshCount }} since your last visit
      </span>
    </div>

    <div v-if="data && !loading" class="changes-controls">
      <input
        v-model="rawQuery"
        type="search"
        class="changes-search"
        placeholder="Filter changes…"
        aria-label="Filter changes"
      />
      <div class="changes-filters" role="group" aria-label="Change type">
        <button
          v-for="f in ['all', 'new', 'updated'] as const"
          :key="f"
          class="filter-chip"
          :class="{ active: filter === f }"
          @click="filter = f"
        >
          {{ f === 'all' ? 'All' : f[0].toUpperCase() + f.slice(1) }}
        </button>
      </div>
      <div class="changes-filters" role="group" aria-label="Date range">
        <button
          v-for="r in ['all', 'w0', 'w1', 'w2', 'w3'] as const"
          :key="r"
          class="filter-chip"
          :class="{ active: range === r }"
          @click="((range = r), (showPicker = false))"
        >
          {{ r === 'all' ? 'All' : weekLabels[r] }}
        </button>
        <button
          class="filter-chip"
          :class="{ active: range === 'custom' }"
          @click="showPicker = !showPicker"
        >
          {{ customRangeLabel }}
        </button>
      </div>
    </div>

    <div v-if="showPicker" class="date-picker">
      <label>
        From
        <input v-model="rangeFrom" type="date" class="date-input" />
      </label>
      <label>
        To
        <input v-model="rangeTo" type="date" class="date-input" />
      </label>
      <button
        class="filter-chip"
        :disabled="!rangeFrom && !rangeTo"
        @click="((range = 'custom'), (showPicker = false))"
      >
        Apply
      </button>
      <button
        class="filter-chip"
        @click="
          ((rangeFrom = ''),
          (rangeTo = ''),
          (range = 'all'),
          (showPicker = false))
        "
      >
        Clear
      </button>
    </div>

    <div v-if="loading" class="changes-status">Loading changes…</div>
    <div v-else-if="error" class="changes-status">
      Couldn't load the changes.
      <button class="retry" @click="load">Retry</button>
      .
    </div>
    <div v-else-if="!groups.length" class="changes-status">
      No changes match this filter.
    </div>

    <section v-for="group in groups" :key="group.label" class="changes-group">
      <h2 class="group-title">{{ group.label }}</h2>
      <div
        v-for="c in visibleCommits(group)"
        :key="c.commit.sha"
        class="commit-block"
        :class="{ fresh: isFresh(c.commit) }"
      >
        <div class="commit-meta">
          <span class="commit-date">{{ formatDate(c.commit.date) }}</span>
          <a
            class="commit-sha"
            :href="`${COMMIT_URL}${c.commit.sha}`"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ c.commit.sha.slice(0, 8) }}
          </a>
          <span class="commit-msg">{{ c.commit.message }}</span>
        </div>
        <ul class="entry-list">
          <li v-for="(e, i) in visibleEntries(c)" :key="i" class="entry">
            <div class="entry-row">
              <span class="badge" :class="e.type">
                {{ e.type === 'new' ? 'new' : 'upd' }}
              </span>
              <span class="entry-link" v-html="renderEntry(e)" />
              <a class="entry-source" :href="sourceHref(e.source, e.anchor)">
                {{ e.source }}
              </a>
            </div>
          </li>
        </ul>
        <button
          v-if="
            !expandedCommits.has(c.commit.sha) &&
            c.entries.length > ENTRIES_PER_COMMIT
          "
          class="show-more"
          @click="expandedCommits.add(c.commit.sha)"
        >
          Show {{ c.entries.length - ENTRIES_PER_COMMIT }} more entries
        </button>
      </div>
      <button
        v-if="
          !expandedGroups.has(group.label) &&
          group.commits.length > COMMITS_PER_GROUP
        "
        class="show-more"
        @click="expandedGroups.add(group.label)"
      >
        Show {{ group.commits.length - COMMITS_PER_GROUP }} more commits
      </button>
    </section>
  </div>
</template>

<style scoped>
.changes-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}

.meta-month {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.meta-count {
  padding: 0.1rem 0.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}

.meta-fresh {
  padding: 0.1rem 0.5rem;
  border-radius: 6px;
  color: var(--vp-c-brand-1);
  border: 1px solid var(--vp-c-brand-1);
}

.changes-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1.75rem;
}

.changes-search {
  flex: 1;
  min-width: 180px;
  padding: 0.4rem 0.75rem;
  font-size: 0.9rem;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}

.changes-search:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}

.changes-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.filter-chip {
  padding: 0.35rem 0.8rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s;
}

.filter-chip:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-text-1);
}

.filter-chip.active {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.filter-chip:disabled {
  opacity: 0.5;
  cursor: default;
}

.date-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin: -0.75rem 0 1.5rem;
  padding: 0.75rem 1rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}

.date-picker label {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}

.date-input {
  padding: 0.25rem 0.5rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}

.changes-status {
  padding: 2rem 0;
  color: var(--vp-c-text-2);
}

.retry {
  color: var(--vp-c-brand-1);
  text-decoration: underline;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  font: inherit;
}

.show-more {
  display: block;
  margin: -0.5rem auto 1.5rem;
  padding: 0.35rem 1rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s;
}

.show-more:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-text-1);
}

.group-title {
  font-size: 1.3rem;
  font-weight: 700;
  margin: 2rem 0 0.75rem;
  border: none;
  padding: 0;
}

.commit-block {
  border-left: 2px solid var(--vp-c-divider);
  padding: 0.25rem 0 0.25rem 1rem;
  margin-bottom: 1.5rem;
}

.commit-block.fresh {
  border-left-color: var(--vp-c-brand-1);
}

.commit-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: baseline;
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
  margin-bottom: 0.5rem;
}

.commit-date {
  color: var(--vp-c-text-2);
  font-weight: 600;
}

.commit-sha {
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-brand-1);
}

.commit-msg {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.entry-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.entry {
  padding: 0.3rem 0;
}

.entry-row {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.92rem;
  line-height: 1.5;
}

.badge {
  flex-shrink: 0;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  width: 2.4rem;
  text-align: center;
  border-radius: 4px;
  padding: 0.05rem 0;
}

/* Status colours follow the custom-block palettes so they stay readable in
   every theme: `text` (not `textDeep`, which darkens on dark themes). */
.badge.new {
  color: var(--vp-custom-block-tip-text, var(--vp-c-green-1, #18794e));
  background: var(--vp-custom-block-tip-bg, rgba(61, 214, 140, 0.12));
}

.badge.updated {
  color: var(--vp-custom-block-warning-text);
  background: var(--vp-custom-block-warning-bg);
}

.entry-link {
  min-width: 0;
  word-break: break-word;
}

/* Injected via v-html, so scoped styles need :deep() to reach it. */
.entry-link :deep(.entry-ext) {
  margin-left: 0.25rem;
  font-size: 0.75em;
  text-decoration: none;
  opacity: 0.55;
}

.entry-link :deep(.entry-ext):hover {
  opacity: 1;
}

.entry-source {
  flex-shrink: 0;
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  white-space: nowrap;
}
</style>
