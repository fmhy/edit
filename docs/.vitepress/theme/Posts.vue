<script setup lang="ts">
import { computed } from 'vue'
import { data as rawPosts } from './posts.data'

interface Post {
  title: string
  url: string
  date: string | number
}

// Group posts ONLY by Year to improve information density
const groupedPosts = computed(() => {
  const postArray: Post[] = Array.isArray(rawPosts)
    ? rawPosts
    : (Object.values(rawPosts).flat() as Post[])

  const groups: Record<string, Post[]> = {}

  for (const post of postArray) {
    const dateNum = post.date || Date.now()
    const year = new Date(dateNum).getFullYear().toString()

    if (!groups[year]) groups[year] = []
    groups[year].push(post)
  }

  return Object.keys(groups)
    .sort((a, b) => Number(b) - Number(a))
    .map((year) => ({
      year,
      // Ensure posts within the year are sorted newest to oldest
      posts: groups[year].sort((a, b) => {
        const dateA = new Date(a.date || 0).getTime()
        const dateB = new Date(b.date || 0).getTime()
        return dateB - dateA
      })
    }))
})

const formatDate = (timestamp: string | number): string => {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit'
  })
}
</script>

<template>
  <div>
    <section>
      <h1 class="flex items-center gap-2">Posts</h1>
      <p>Monthly updates, announcements, and more.</p>
      We also have an
      <a href="/feed.rss" target="_blank" title="RSS feed">
        <div
          class="i-carbon-rss vertical-top"
          style="width: 16px; height: 24px"
        />
        RSS feed.
      </a>
    </section>

    <div class="posts-timeline">
      <div v-for="group in groupedPosts" :key="group.year" class="year-section">
        <h2 class="year-title">{{ group.year }}</h2>
        <div class="posts-list">
          <a
            v-for="post in group.posts"
            :key="post.url"
            :href="post.url"
            class="post-item"
          >
            <div class="post-meta">
              <span v-if="post.date" class="post-date">
                {{ formatDate(post.date) }}
              </span>
              <span class="post-title">{{ post.title }}</span>
            </div>
            <svg
              class="post-arrow"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="16"
              height="16"
            >
              <path
                d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z"
                fill="currentColor"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.VPBadge {
  border: 1px solid transparent;
  border-radius: 8px;
  display: inline-flex;
  margin-left: 2px;
  padding: 0 10px;
  line-height: 22px;
  font-size: 12px;
  font-weight: 500;
  transform: translateY(-2px);
  align-items: center;
  gap: 0.2rem;
  padding-right: 10px;
  vertical-align: middle;
  color: var(--vp-badge-tip-text);
  background-color: transparent;
  border-color: var(--vp-custom-block-tip-outline);
}

.posts-timeline {
  margin-top: 2.5rem;
}

.year-section {
  margin-bottom: 3.5rem;
}

.year-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 1.25rem;
  padding-bottom: 0.25rem;
}

.posts-list {
  border-left: 2px solid var(--vp-c-divider);
  margin-left: 0.25rem;
  display: flex;
  flex-direction: column;
}

.post-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem 0.5rem 1.25rem;
  margin-left: -2px;
  border-left: 2px solid transparent;
  border-radius: 0 8px 8px 0;
  text-decoration: none !important;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.post-item:hover {
  background-color: var(--vp-c-bg-soft);
  border-left-color: var(--vp-c-brand-1);
}

.post-meta {
  display: flex;
  align-items: baseline;
  gap: 1.25rem;
}

.post-date {
  font-size: 0.9rem;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-weight: 500;
  white-space: nowrap;
  min-width: 55px;
  text-transform: uppercase;
}

.post-title {
  font-size: 1.05rem;
  font-weight: 500;
  transition: color 0.2s ease;
  color: var(--vp-c-text-1);
}

.post-item:hover .post-title {
  color: var(--vp-c-brand-1);
}

.post-arrow {
  color: var(--vp-c-text-3);
  opacity: 0;
  transform: translateX(-4px);
  transition:
    transform 0.2s ease,
    color 0.2s ease,
    opacity 0.2s ease;
}

.post-item:hover .post-arrow {
  color: var(--vp-c-brand-1);
  opacity: 1;
  transform: translateX(4px);
}

@media (max-width: 640px) {
  .post-meta {
    gap: 0.75rem;
  }
}
</style>
