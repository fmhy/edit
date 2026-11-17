<script setup lang="ts">
/**
 * Minimal live view of the FMHY Discord wiki markdown.
 * Fetches the raw source at runtime and renders it as clean prose.
 */
import { onMounted, ref } from 'vue'
import { sanitizeRichHtml } from '../composables/sanitize'

const SOURCE_URL =
  'https://raw.githubusercontent.com/wiki/fmhy/FMHY/FMHY-Discord.md'
const WIKI_URL = 'https://github.com/fmhy/FMHY/wiki/FMHY-Discord'
const TITLE = 'FMHY Discord'

type Tone = 'closed' | 'open' | 'idle'

const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorText = ref('')
const statusText = ref('')
const tone = ref<Tone>('idle')
const bodyHtml = ref('')

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Only http(s) URLs are allowed; blocks javascript: and data: schemes. */
function safeUrl(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  try {
    const url = new URL(value, window.location.href)
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.href
      : null
  } catch {
    return null
  }
}

/** Inline formatting: escape first, then code, links and emphasis. */
function inlineMarkdown(text: string): string {
  let out = escapeHtml(text)

  const codes: string[] = []
  out = out.replace(/`([^`]+)`/g, (_m, code: string) => {
    codes.push(`<code>${code}</code>`)
    return `\u0000C${codes.length - 1}\u0000`
  })

  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_m, label: string, href: string) => {
      const safe = safeUrl(href)
      if (!safe) return label
      return `<a href="${escapeHtml(safe)}" rel="noopener noreferrer" target="_blank">${label}</a>`
    }
  )

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

  out = out.replace(
    /\u0000C(\d+)\u0000/g,
    (_m, i: string) => codes[Number(i)] || ''
  )
  return out
}

/**
 * Render the markdown body as plain prose. The "Current Status:" heading is
 * pulled out and returned separately so it can be shown as a label + pill.
 */
function renderBody(md: string): { label: string; html: string } {
  const lines = md.replace(/\r\n?/g, '\n').split('\n')
  const blocks: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let label = ''

  const closeList = () => {
    if (listType) {
      blocks.push(`</${listType}>`)
      listType = null
    }
  }

  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading && /(^|\s)Current Status:/i.test(heading[2])) {
      label = heading[2].replace(/^.*?Current Status:\s*/i, '').trim()
      continue
    }

    const bullet = line.match(/^\s*[-*+]\s+(.*)$/)
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/)
    if (bullet || numbered) {
      const wanted = bullet ? 'ul' : 'ol'
      if (listType !== wanted) {
        closeList()
        listType = wanted
        blocks.push(`<${wanted}>`)
      }
      blocks.push(`<li>${inlineMarkdown((bullet || numbered)![1])}</li>`)
      continue
    }
    closeList()

    if (heading) {
      const level = Math.min(heading[1].length + 1, 6)
      blocks.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`)
      continue
    }

    const quote = line.match(/^>\s?(.*)$/)
    if (quote) {
      blocks.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`)
      continue
    }

    if (!line.trim()) continue
    blocks.push(`<p>${inlineMarkdown(line)}</p>`)
  }
  closeList()

  return { label, html: blocks.join('\n') }
}

async function load() {
  status.value = 'loading'
  errorText.value = ''
  statusText.value = ''
  tone.value = 'idle'
  bodyHtml.value = ''
  try {
    const response = await fetch(SOURCE_URL, { cache: 'no-store' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const markdown = await response.text()
    if (!markdown.trim()) throw new Error('empty document')

    const parsed = renderBody(markdown)
    statusText.value = parsed.label
    tone.value = /closed/i.test(parsed.label)
      ? 'closed'
      : /open/i.test(parsed.label)
        ? 'open'
        : 'idle'
    bodyHtml.value = sanitizeRichHtml(parsed.html)
    status.value = 'ready'
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : String(error)
    status.value = 'error'
  }
}

onMounted(load)
</script>

<template>
  <div class="dw-root">
    <h1>{{ TITLE }}</h1>

    <noscript>
      <p class="dw-note">
        This page loads its content with JavaScript. View the
        <a :href="WIKI_URL" target="_blank" rel="noopener noreferrer">
          FMHY Discord wiki on GitHub
        </a>
        instead.
      </p>
    </noscript>

    <p v-if="status === 'loading'" class="dw-note">Loading…</p>

    <p v-else-if="status === 'error'" class="dw-note">
      Could not load ({{ errorText }}).
    </p>

    <template v-else>
      <p class="dw-status">
        <span class="dw-status-label">Current Status:</span>
        <span class="dw-pill" :class="`dw-pill-${tone}`">{{ statusText }}</span>
      </p>
      <div class="dw-body" v-html="bodyHtml"></div>
      <p class="dw-source">
        <a :href="WIKI_URL" target="_blank" rel="noopener noreferrer">Source</a>
      </p>
    </template>
  </div>
</template>

<style scoped>
.dw-root {
  color: var(--vp-c-text-1);
  padding: 8px 0 48px;
  width: 100%;
}

.dw-root h1 {
  border: 0;
  font-size: 32px;
  letter-spacing: -0.02em;
  line-height: 1.2;
  margin: 0 0 24px;
  padding: 0;
}

.dw-note {
  color: var(--vp-c-text-2);
  font-size: 15px;
  margin: 0;
}

.dw-status {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0 0 24px;
}

.dw-status-label {
  color: var(--vp-c-text-2);
  font-size: 16px;
  font-weight: 600;
}

.dw-pill {
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 1.4;
  padding: 2px 12px;
}

.dw-pill-closed {
  background: var(--vp-c-red-soft, rgba(214, 78, 78, 0.15));
  color: var(--vp-c-red-1, #d64e4e);
}

.dw-pill-open {
  background: var(--vp-c-green-soft, rgba(16, 160, 110, 0.15));
  color: var(--vp-c-green-1, #10a06e);
}

.dw-pill-idle {
  background: var(--vp-c-bg-soft, var(--vp-c-bg-alt));
  color: var(--vp-c-text-2);
}

.dw-source {
  font-size: 12px;
  margin: 24px 0 0;
}

.dw-source a {
  color: var(--vp-c-text-3, var(--vp-c-text-2));
  text-decoration: none;
}

.dw-source a:hover {
  color: var(--vp-c-text-2);
  text-decoration: underline;
}

.dw-body {
  font-size: 16px;
  line-height: 1.65;
}

.dw-body :deep(p) {
  margin: 0 0 16px;
}

.dw-body :deep(ul),
.dw-body :deep(ol) {
  margin: 0 0 16px;
  padding-left: 24px;
}

.dw-body :deep(li) {
  margin-bottom: 8px;
}

.dw-body :deep(a) {
  color: var(--vp-c-brand-1);
  text-decoration: underline;
  text-decoration-color: var(--vp-c-brand-soft, var(--vp-c-brand-1));
  text-underline-offset: 3px;
}

.dw-body :deep(code) {
  background: var(--vp-c-bg-soft, var(--vp-c-bg-alt));
  border-radius: 4px;
  font-size: 0.9em;
  padding: 1px 5px;
}

@media (max-width: 520px) {
  .dw-root h1 {
    font-size: 28px;
  }

  .dw-body {
    font-size: 15px;
  }
}
</style>
