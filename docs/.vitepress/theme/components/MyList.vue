<script setup lang="ts">
import type { DisplayRow } from '../composables/useSavedRowResolver'
import { computed } from 'vue'
import { useLinkBookmarks } from '../composables/linkBookmarks'
import { sanitizeRichHtml } from '../composables/sanitize'
import { useSavedRowResolver } from '../composables/useSavedRowResolver'

const { remove } = useLinkBookmarks()
const { displayRows, loading, ready } = useSavedRowResolver()

const PAGE_LABELS: Record<string, string> = {
  '/video': 'Movies / TV / Anime',
  '/audio': 'Music / Podcasts / Radio',
  '/gaming': 'Gaming / Emulation',
  '/reading': 'Books / Comics / Manga',
  '/privacy': 'Adblocking / Privacy',
  '/ai': 'Artificial Intelligence',
  '/downloading': 'Downloading',
  '/torrenting': 'Torrenting',
  '/mobile': 'Android / iOS',
  '/linux-macos': 'Linux / macOS',
  '/misc': 'Miscellaneous'
}

const groupedRows = computed(() => {
  const groups = new Map<string, DisplayRow[]>()

  for (const row of displayRows.value) {
    const key = row.page || '/'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }

  return [...groups.entries()].map(([page, rows]) => ({
    page,
    label: PAGE_LABELS[page] || page.replace(/^\//, '').replace(/-/g, ' '),
    rows
  }))
})

const rowHtml = (row: DisplayRow) => sanitizeRichHtml(row.html)

const rowClasses = (row: DisplayRow) =>
  [
    'fmhy-saved-item',
    row.status === 'missing' ? 'fmhy-saved-item--missing' : '',
    ...row.classes.split(/\s+/).filter(Boolean)
  ].filter(Boolean)

const showLoader = computed(() => !ready.value || loading.value)
</script>

<template>
  <div class="fmhy-saved-list">
    <h1 class="flex items-center gap-2">
      <span class="i-twemoji:bookmark" aria-hidden="true" />
      My List
    </h1>
    <p class="fmhy-saved-intro">Your saved wiki entries.</p>

    <div
      v-if="showLoader"
      class="fmhy-saved-loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="fmhy-saved-loading-head">
        <span class="fmhy-saved-spinner" aria-hidden="true" />
        <span class="fmhy-saved-loading-text">Loading saved entries…</span>
      </div>
      <div class="fmhy-saved-skeleton" aria-hidden="true">
        <div class="fmhy-saved-skeleton-title" />
        <div class="fmhy-saved-skeleton-line" />
        <div class="fmhy-saved-skeleton-line" />
        <div class="fmhy-saved-skeleton-line fmhy-saved-skeleton-line--short" />
      </div>
    </div>

    <p v-else-if="displayRows.length === 0" class="fmhy-saved-empty">
      Nothing saved yet. Hover a link on any wiki page and click
      <strong>Bookmark</strong>
      .
    </p>

    <section
      v-for="group in groupedRows"
      v-else
      :key="group.page"
      class="fmhy-saved-group"
    >
      <h2 class="fmhy-saved-group-title">
        <a :href="group.page">{{ group.label }}</a>
      </h2>

      <ul>
        <li v-for="row in group.rows" :key="row.url" :class="rowClasses(row)">
          <span class="fmhy-saved-item-content" v-html="rowHtml(row)" />
          <span
            v-if="row.status === 'missing'"
            class="fmhy-saved-status fmhy-saved-status--missing"
            title="This entry was removed from the wiki"
          >
            removed
          </span>
          <button
            type="button"
            class="fmhy-saved-remove"
            aria-label="Remove from My List"
            @click="remove(row.url)"
          >
            <span class="i-lucide:x shrink-0 w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.fmhy-saved-list {
  max-width: 100%;
}

.fmhy-saved-intro {
  color: var(--vp-c-text-2);
  margin: 0 0 1.5rem;
}

.fmhy-saved-loading {
  padding: 1.25rem;
  border: 2px dashed var(--vp-c-divider);
  border-radius: 0.75rem;
  background: var(--vp-c-bg-soft);
}

.fmhy-saved-loading-head {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-bottom: 1rem;
}

.fmhy-saved-loading-text {
  color: var(--vp-c-text-2);
  font-size: 0.95rem;
}

.fmhy-saved-spinner {
  display: block;
  flex-shrink: 0;
  width: 1.1rem;
  height: 1.1rem;
  border: 2px solid var(--vp-c-divider);
  border-top-color: var(--vp-c-brand-1);
  border-radius: 50%;
  animation: fmhy-saved-spin 0.65s linear infinite;
}

.fmhy-saved-skeleton {
  display: grid;
  gap: 0.65rem;
}

.fmhy-saved-skeleton-title,
.fmhy-saved-skeleton-line {
  height: 0.85rem;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--vp-c-text-3) 12%, var(--vp-c-bg-alt)) 0%,
    color-mix(in srgb, var(--vp-c-text-3) 22%, var(--vp-c-bg-alt)) 50%,
    color-mix(in srgb, var(--vp-c-text-3) 12%, var(--vp-c-bg-alt)) 100%
  );
  background-size: 200% 100%;
  animation: fmhy-saved-shimmer 1.4s ease-in-out infinite;
}

.fmhy-saved-skeleton-title {
  width: 38%;
  height: 1rem;
}

.fmhy-saved-skeleton-line--short {
  width: 72%;
}

.fmhy-saved-empty {
  color: var(--vp-c-text-2);
  padding: 1.25rem;
  border: 2px dashed var(--vp-c-divider);
  border-radius: 0.75rem;
  background: var(--vp-c-bg-soft);
}

@keyframes fmhy-saved-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes fmhy-saved-shimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}

.fmhy-saved-group + .fmhy-saved-group {
  margin-top: 2rem;
}

.fmhy-saved-group-title {
  margin: 0 0 0.75rem;
  font-size: 1.1rem;
  font-weight: 600;
}

.fmhy-saved-group-title a {
  color: var(--vp-c-text-1);
  text-decoration: none;
}

.fmhy-saved-group-title a:hover {
  color: var(--vp-c-brand-1);
}

.fmhy-saved-item {
  position: relative;
}

.fmhy-saved-item-content {
  display: inline;
}

.fmhy-saved-status {
  margin-left: 0.35rem;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--vp-c-text-3);
  vertical-align: middle;
}

.fmhy-saved-status--missing {
  color: var(--vp-c-warning-1, #e7a006);
}

.fmhy-saved-remove {
  position: absolute;
  right: 0;
  top: 0.1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: none;
  border-radius: 0.35rem;
  background: transparent;
  color: var(--vp-c-text-3);
  cursor: pointer;
  opacity: 0;
  transition:
    opacity 0.15s ease,
    color 0.15s ease,
    background-color 0.15s ease;
}

.fmhy-saved-item:hover .fmhy-saved-remove,
.fmhy-saved-remove:focus-visible {
  opacity: 1;
}

.fmhy-saved-remove:hover,
.fmhy-saved-remove:focus-visible {
  color: var(--vp-c-brand-1);
  background: color-mix(in srgb, var(--vp-c-brand-1) 8%, var(--vp-c-bg-alt));
}
</style>
