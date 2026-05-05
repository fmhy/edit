<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const time = ref(new Date())

function updateTime() {
  time.value = new Date()
}

let interval: ReturnType<typeof setInterval>

onMounted(() => {
  updateTime()
  interval = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  clearInterval(interval)
})

const timeString = computed(() => {
  const t = time.value
  const h = String(t.getHours()).padStart(2, '0')
  const m = String(t.getMinutes()).padStart(2, '0')
  const s = String(t.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
})

const dateString = computed(() => {
  const t = time.value
  const y = t.getFullYear()
  const mo = String(t.getMonth() + 1).padStart(2, '0')
  const d = String(t.getDate()).padStart(2, '0')
  return `${y}-${mo}-${d}`
})

const links = [
  { key: 'gh', label: 'github', url: 'https://github.com' },
  { key: 'hn', label: 'hacker news', url: 'https://news.ycombinator.com' },
  { key: 'rd', label: 'reddit', url: 'https://reddit.com' },
  { key: 'yt', label: 'youtube', url: 'https://youtube.com' },
  { key: 'fm', label: 'fmhy', url: 'https://fmhy.net' },
]

const query = ref('')
const input = ref<HTMLInputElement | null>(null)

function handleKeydown(e: KeyboardEvent) {
  if (e.key === '/' && document.activeElement !== input.value) {
    const tag = document.activeElement?.tagName
    if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
      e.preventDefault()
      input.value?.focus()
    }
  }
  if (e.key === 'Escape') {
    input.value?.blur()
    query.value = ''
  }
}

function submit() {
  const q = query.value.trim()
  if (!q) return
  window.open(`https://searx.fmhy.net/search?q=${encodeURIComponent(q)}`, '_self')
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="monotype-root">
    <div class="monotype-container">
      <div class="monotype-clock">{{ timeString }}</div>
      <div class="monotype-date">{{ dateString }}</div>

      <form class="monotype-form" @submit.prevent="submit">
        <span class="monotype-prompt">$</span>
        <input
          ref="input"
          v-model="query"
          class="monotype-input"
          placeholder="type a command..."
        />
        <span class="monotype-cursor" />
      </form>

      <div class="monotype-links">
        <div class="monotype-section-title">quick links</div>
        <div class="monotype-links-grid">
          <a
            v-for="link in links"
            :key="link.key"
            :href="link.url"
            class="monotype-link"
            target="_blank"
          >
            <span class="monotype-link-key">[{{ link.key }}]</span>
            {{ link.label }}
          </a>
        </div>
      </div>

      <div class="monotype-footer">
        <span class="monotype-footer-text">type / to search &bull; esc to clear</span>
      </div>
    </div>
  </div>
</template>

<style>
.monotype-root {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', 'Courier New', monospace;
}

.monotype-container {
  text-align: center;
  width: 100%;
  max-width: 36rem;
  padding: 2rem;
}

.monotype-clock {
  font-size: clamp(3rem, 10vw, 5rem);
  font-weight: 300;
  letter-spacing: 0.1em;
  line-height: 1;
  color: var(--vp-c-text-1);
}

.monotype-date {
  font-size: 0.875rem;
  color: var(--vp-c-text-3);
  margin-top: 0.5rem;
  letter-spacing: 0.05em;
}

.monotype-form {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2.5rem;
  gap: 0.5rem;
  border-bottom: 1px solid var(--vp-c-text-3);
  padding-bottom: 0.5rem;
}

.monotype-prompt {
  color: var(--vp-c-text-3);
  font-size: 1.125rem;
  user-select: none;
}

.monotype-input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--vp-c-text-1);
  font-family: inherit;
  font-size: 1.125rem;
  flex: 1;
  min-width: 0;
  caret-color: var(--vp-c-text-1);
}

.monotype-input::placeholder {
  color: var(--vp-c-text-3);
  opacity: 0.5;
}

.monotype-cursor {
  display: inline-block;
  width: 0.6em;
  height: 1.2em;
  background: transparent;
}

.monotype-input:focus + .monotype-cursor {
  background: var(--vp-c-text-1);
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

.monotype-links {
  margin-top: 3rem;
}

.monotype-section-title {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin-bottom: 1rem;
}

.monotype-links-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
}

.monotype-link {
  color: var(--vp-c-text-2);
  text-decoration: none;
  font-size: 0.9375rem;
  border-bottom: 1px solid transparent;
}

.monotype-link:hover {
  color: var(--vp-c-text-1);
  border-bottom-color: var(--vp-c-text-1);
}

.monotype-link-key {
  color: var(--vp-c-text-3);
  margin-right: 0.5rem;
}

.monotype-footer {
  margin-top: 3rem;
}

.monotype-footer-text {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}
</style>
