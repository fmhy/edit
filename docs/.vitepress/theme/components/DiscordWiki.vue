<script setup lang="ts">
/**
 * Fetches the FMHY Discord wiki page (raw markdown) at runtime and renders it
 * as cards. Everything is scoped to this component; no other page or shared
 * component is touched.
 */
import { computed, onMounted, ref } from 'vue'
import { sanitizeRichHtml } from '../composables/sanitize'

const SOURCE_URL =
  'https://raw.githubusercontent.com/wiki/fmhy/FMHY/FMHY-Discord.md'
const SOURCE_HUMAN = 'FMHY-Discord.md'

type Section = {
  id: string
  title: string
  html: string
  plain: string
  links: { label: string; href: string }[]
  expanded: boolean
}

const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMsg = ref('')
const sections = ref<Section[]>([])
const rawMarkdown = ref('')
const copiedKey = ref('')
const search = ref('')

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return sections.value
  return sections.value.filter(
    (s) =>
      s.title.toLowerCase().includes(q) || s.plain.toLowerCase().includes(q)
  )
})

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Safe absolute http(s)/mailto URL only; blocks javascript: and other schemes. */
function safeUrl(raw: string): string | null {
  const v = raw.trim()
  if (!v) return null
  try {
    const u = new URL(v, window.location.href)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null
  } catch {
    return null
  }
}

function hostOf(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, '')
  } catch {
    return href
  }
}

/** Inline markdown: escape first, then code, links, bold and italics. */
function inlineMarkdown(text: string): string {
  let out = escapeHtml(text)

  // Inline code first so its contents are not parsed as other markup.
  const codes: string[] = []
  out = out.replace(/`([^`]+)`/g, (_m, code: string) => {
    codes.push(`<code>${code}</code>`)
    return `\u0000C${codes.length - 1}\u0000`
  })

  // Links [label](url)
  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_m, label: string, href: string) => {
      const safe = safeUrl(href)
      if (!safe) return label
      const ext = safe.startsWith('http')
        ? ' rel="noopener noreferrer" target="_blank"'
        : ''
      return `<a href="${escapeHtml(safe)}"${ext}>${label}</a>`
    }
  )

  // Bare URLs
  out = out.replace(
    /(^|[\s(])(https?:\/\/[^\s<)]+)/g,
    (_m, pre: string, href: string) => {
      const safe = safeUrl(href)
      if (!safe) return pre + href
      return `${pre}<a href="${escapeHtml(safe)}" rel="noopener noreferrer" target="_blank">${href}</a>`
    }
  )

  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>')

  // Restore inline code placeholders.
  out = out.replace(
    /\u0000C(\d+)\u0000/g,
    (_m, i: string) => codes[Number(i)] || ''
  )
  return out
}

/** Extract every real http(s) link from a chunk of markdown text. */
function extractLinks(text: string): { label: string; href: string }[] {
  const links: { label: string; href: string }[] = []
  const seen = new Set<string>()
  const mdLink = /\[([^\]]+)\]\(([^)]+)\)/g
  let m: RegExpExecArray | null
  while ((m = mdLink.exec(text)) !== null) {
    const safe = safeUrl(m[2])
    if (safe && !seen.has(safe)) {
      seen.add(safe)
      links.push({ label: m[1].trim() || hostOf(safe), href: safe })
    }
  }
  const bare = /https?:\/\/[^\s<)]+/g
  while ((m = bare.exec(text)) !== null) {
    const safe = safeUrl(m[0])
    if (safe && !seen.has(safe)) {
      seen.add(safe)
      links.push({ label: hostOf(safe), href: safe })
    }
  }
  return links
}

/** Tiny block-level markdown renderer: headings, lists, quotes, code, paras. */
function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n?/g, '\n').split('\n')
  const out: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let inCode = false
  let code: string[] = []

  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`)
      listType = null
    }
  }

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      if (inCode) {
        out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`)
        code = []
        inCode = false
      } else {
        closeList()
        inCode = true
      }
      continue
    }
    if (inCode) {
      code.push(line)
      continue
    }

    const ul = line.match(/^\s*[-*+]\s+(.*)$/)
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/)
    if (ul || ol) {
      const wanted = ul ? 'ul' : 'ol'
      if (listType !== wanted) {
        closeList()
        listType = wanted
        out.push(`<${wanted}>`)
      }
      out.push(`<li>${inlineMarkdown((ul || ol)![1])}</li>`)
      continue
    }
    closeList()

    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      const level = Math.min(h[1].length + 1, 6)
      out.push(`<h${level}>${inlineMarkdown(h[2])}</h${level}>`)
      continue
    }

    const quote = line.match(/^>\s?(.*)$/)
    if (quote) {
      out.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`)
      continue
    }

    if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) {
      out.push('<hr>')
      continue
    }

    if (!line.trim()) continue
    out.push(`<p>${inlineMarkdown(line)}</p>`)
  }
  closeList()
  if (inCode) out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`)
  return out.join('\n')
}

/** Strip markdown syntax to readable plain text for the Copy button. */
function toPlain(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/^```\w*\n?|\n?```$/g, ''))
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/^\s*[-*+]\s+/gm, '- ')
    .replace(/^\s*\d+[.)]\s+/gm, '- ')
    .replace(/^(#{1,6})\s+/gm, '')
    .replace(/[*_~`>]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Split the document into one card per heading (plus an intro if present). */
function parseSections(md: string): Section[] {
  const lines = md.replace(/\r\n?/g, '\n').split('\n')
  const chunks: { title: string; body: string[] }[] = []
  const intro: string[] = []
  let current: { title: string; body: string[] } | null = null

  for (const line of lines) {
    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      if (current) chunks.push(current)
      current = { title: h[2].trim(), body: [] }
    } else if (current) {
      current.body.push(line)
    } else if (line.trim()) {
      intro.push(line)
    }
  }
  if (current) chunks.push(current)

  const result: Section[] = []
  if (intro.length) {
    const body = intro.join('\n')
    result.push({
      id: 'intro',
      title: 'Overview',
      html: sanitizeRichHtml(renderMarkdown(body)),
      plain: toPlain(body),
      links: extractLinks(body),
      expanded: true
    })
  }
  chunks.forEach((c, i) => {
    const body = c.body.join('\n')
    result.push({
      id: `section-${i}`,
      title: c.title,
      html: sanitizeRichHtml(renderMarkdown(body)),
      plain: toPlain(`${c.title}\n\n${body}`),
      links: extractLinks(body),
      expanded: true
    })
  })
  return result
}

async function load() {
  status.value = 'loading'
  errorMsg.value = ''
  sections.value = []
  try {
    const res = await fetch(SOURCE_URL, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    if (!text.trim()) throw new Error('empty document')
    rawMarkdown.value = text
    sections.value = parseSections(text)
    status.value = 'ready'
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : String(e)
    status.value = 'error'
  }
}

async function copyText(text: string, key: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
    } catch {
      /* clipboard unavailable */
    }
    ta.remove()
  }
  copiedKey.value = key
  window.setTimeout(() => {
    if (copiedKey.value === key) copiedKey.value = ''
  }, 1600)
}

function toggle(s: Section) {
  s.expanded = !s.expanded
}

onMounted(load)
</script>

<template>
  <div class="dw-root">
    <header class="dw-head">
      <div class="dw-head-top">
        <h1>FMHY Discord</h1>
        <span class="dw-live" :class="status">{{ status }}</span>
      </div>
      <p class="dw-sub">
        Live view of
        <a :href="SOURCE_URL" target="_blank" rel="noopener noreferrer">
          {{ SOURCE_HUMAN }}
        </a>
      </p>
      <div class="dw-toolbar">
        <input
          v-model="search"
          class="dw-search"
          type="search"
          placeholder="Filter cards"
          aria-label="Filter cards"
        />
        <button class="dw-btn" type="button" @click="load">Reload</button>
        <button
          v-if="status === 'ready'"
          class="dw-btn"
          type="button"
          @click="copyText(rawMarkdown, 'all')"
        >
          {{ copiedKey === 'all' ? 'Copied' : 'Copy all' }}
        </button>
        <a
          class="dw-btn dw-btn-primary"
          :href="SOURCE_URL"
          target="_blank"
          rel="noopener noreferrer"
        >
          Source
        </a>
      </div>
    </header>

    <div v-if="status === 'loading'" class="dw-state" role="status">
      <div class="dw-spinner"></div>
      <p>Loading markdown…</p>
    </div>

    <div v-else-if="status === 'error'" class="dw-state dw-error" role="alert">
      <p class="dw-state-title">Could not load the source.</p>
      <p class="dw-state-msg">{{ errorMsg }}</p>
      <p class="dw-hint">
        The fetch may be blocked here. Open the
        <a :href="SOURCE_URL" target="_blank" rel="noopener noreferrer">
          raw file
        </a>
        directly, then use Reload.
      </p>
      <button class="dw-btn" type="button" @click="load">Retry</button>
    </div>

    <template v-else>
      <p v-if="!filtered.length" class="dw-state">
        No cards match "{{ search }}".
      </p>
      <div class="dw-grid">
        <article v-for="s in filtered" :key="s.id" class="dw-card">
          <div class="dw-card-head">
            <h2>{{ s.title }}</h2>
            <div class="dw-card-actions">
              <button
                class="dw-btn dw-btn-sm"
                type="button"
                :aria-label="`Copy ${s.title}`"
                @click="copyText(s.plain, s.id)"
              >
                {{ copiedKey === s.id ? 'Copied' : 'Copy' }}
              </button>
              <button
                class="dw-btn dw-btn-sm"
                type="button"
                :aria-expanded="s.expanded"
                @click="toggle(s)"
              >
                {{ s.expanded ? 'Collapse' : 'Expand' }}
              </button>
            </div>
          </div>
          <div v-show="s.expanded" class="dw-card-body" v-html="s.html"></div>
          <div v-if="s.links.length" class="dw-card-links">
            <a
              v-for="(l, i) in s.links"
              :key="i"
              class="dw-btn dw-btn-sm dw-btn-primary"
              :href="l.href"
              target="_blank"
              rel="noopener noreferrer"
              :title="l.href"
            >
              {{ l.label }} ↗
            </a>
          </div>
        </article>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dw-root {
  --dw-soft: var(--vp-c-bg-soft, var(--vp-c-bg-alt));
  --dw-elv: var(--vp-c-bg-elv, var(--vp-c-bg));
  --dw-text: var(--vp-c-text-1);
  --dw-muted: var(--vp-c-text-2);
  --dw-border: var(--vp-c-divider, rgba(127, 127, 127, 0.25));
  --dw-brand: var(--vp-c-brand-1, #7bc5e4);
  color: var(--dw-text);
  margin: 0 auto;
  max-width: 1100px;
  padding: 24px 20px 64px;
}

.dw-head {
  margin-bottom: 24px;
}
.dw-head-top {
  align-items: center;
  display: flex;
  gap: 12px;
}
.dw-head h1 {
  border: 0;
  font-size: 30px;
  letter-spacing: -0.02em;
  margin: 0;
  padding: 0;
}
.dw-sub {
  color: var(--dw-muted);
  font-size: 14px;
  margin: 6px 0 16px;
}
.dw-sub a {
  color: var(--dw-brand);
}
.dw-live {
  border: 1px solid var(--dw-border);
  border-radius: 999px;
  color: var(--dw-muted);
  font-size: 11px;
  letter-spacing: 0.04em;
  padding: 2px 10px;
  text-transform: uppercase;
}
.dw-live.ready {
  border-color: var(--dw-brand);
  color: var(--dw-brand);
}
.dw-live.error {
  border-color: #e05561;
  color: #e05561;
}

.dw-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.dw-search {
  background: var(--dw-soft);
  border: 1px solid var(--dw-border);
  border-radius: 8px;
  color: var(--dw-text);
  flex: 1 1 220px;
  font-size: 14px;
  min-width: 180px;
  padding: 8px 12px;
}
.dw-search:focus {
  border-color: var(--dw-brand);
  outline: none;
}

.dw-btn {
  align-items: center;
  background: var(--dw-soft);
  border: 1px solid var(--dw-border);
  border-radius: 8px;
  color: var(--dw-text);
  cursor: pointer;
  display: inline-flex;
  font-size: 13px;
  font-weight: 600;
  gap: 4px;
  justify-content: center;
  line-height: 1.2;
  padding: 8px 14px;
  text-decoration: none;
  transition:
    border-color 0.15s,
    background 0.15s;
}
.dw-btn:hover {
  border-color: var(--dw-brand);
}
.dw-btn-sm {
  font-size: 12px;
  padding: 5px 10px;
}
.dw-btn-primary {
  background: var(--dw-brand);
  border-color: var(--dw-brand);
  color: #0b1116;
}

.dw-state {
  align-items: center;
  border: 1px dashed var(--dw-border);
  border-radius: 12px;
  color: var(--dw-muted);
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
  min-height: 160px;
  padding: 32px;
  text-align: center;
}
.dw-state-title {
  color: var(--dw-text);
  font-size: 16px;
  font-weight: 700;
  margin: 0;
}
.dw-state-msg {
  font-family: monospace;
  font-size: 13px;
  margin: 0;
}
.dw-hint {
  font-size: 13px;
  margin: 0;
}
.dw-hint a {
  color: var(--dw-brand);
}
.dw-spinner {
  animation: dw-spin 0.8s linear infinite;
  border: 3px solid var(--dw-border);
  border-radius: 50%;
  border-top-color: var(--dw-brand);
  height: 28px;
  width: 28px;
}
@keyframes dw-spin {
  to {
    transform: rotate(360deg);
  }
}

.dw-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}
.dw-card {
  background: var(--dw-elv);
  border: 1px solid var(--dw-border);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  transition:
    border-color 0.15s,
    transform 0.15s;
}
.dw-card:hover {
  border-color: var(--dw-brand);
  transform: translateY(-2px);
}
.dw-card-head {
  align-items: flex-start;
  background: var(--dw-soft);
  border-bottom: 1px solid var(--dw-border);
  display: flex;
  gap: 8px;
  justify-content: space-between;
  padding: 14px 16px;
}
.dw-card-head h2 {
  font-size: 16px;
  line-height: 1.3;
  margin: 0;
  overflow-wrap: anywhere;
}
.dw-card-actions {
  display: flex;
  flex-shrink: 0;
  gap: 6px;
}
.dw-card-body {
  color: var(--dw-text);
  font-size: 14px;
  line-height: 1.55;
  overflow-wrap: anywhere;
  padding: 14px 16px;
}
.dw-card-body :deep(a) {
  color: var(--dw-brand);
}
.dw-card-body :deep(h3),
.dw-card-body :deep(h4) {
  font-size: 14px;
  margin: 12px 0 6px;
}
.dw-card-body :deep(p) {
  margin: 0 0 10px;
}
.dw-card-body :deep(ul),
.dw-card-body :deep(ol) {
  margin: 0 0 10px;
  padding-left: 20px;
}
.dw-card-body :deep(li) {
  margin-bottom: 4px;
}
.dw-card-body :deep(code) {
  background: var(--dw-soft);
  border-radius: 4px;
  font-size: 0.9em;
  padding: 1px 5px;
}
.dw-card-body :deep(pre) {
  background: var(--dw-soft);
  border-radius: 6px;
  overflow-x: auto;
  padding: 10px;
}
.dw-card-body :deep(pre code) {
  background: none;
  padding: 0;
}
.dw-card-body :deep(blockquote) {
  border-left: 3px solid var(--dw-brand);
  color: var(--dw-muted);
  margin: 0 0 10px;
  padding-left: 10px;
}
.dw-card-links {
  border-top: 1px solid var(--dw-border);
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: auto;
  padding: 12px 16px;
}

@media (max-width: 520px) {
  .dw-card-head {
    flex-direction: column;
  }
}
</style>
