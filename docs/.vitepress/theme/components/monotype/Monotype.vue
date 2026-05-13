<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const time = ref(new Date())
const query = ref('')
const history = ref<string[]>([])
const historyIndex = ref(-1)
const input = ref<HTMLInputElement | null>(null)

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
  return [
    String(t.getHours()).padStart(2, '0'),
    String(t.getMinutes()).padStart(2, '0'),
    String(t.getSeconds()).padStart(2, '0')
  ].join(':')
})

const dateString = computed(() => {
  const t = time.value
  return [
    String(t.getFullYear()),
    String(t.getMonth() + 1).padStart(2, '0'),
    String(t.getDate()).padStart(2, '0')
  ].join('-')
})

const categories = [
  {
    label: 'general',
    links: [
      { key: 'gh', label: 'github', url: 'https://github.com' },
      { key: 'hn', label: 'hacker news', url: 'https://news.ycombinator.com' },
      { key: 'rd', label: 'reddit', url: 'https://reddit.com' }
    ]
  },
  {
    label: 'media',
    links: [
      { key: 'yt', label: 'youtube', url: 'https://youtube.com' },
      { key: 'tw', label: 'twitch', url: 'https://twitch.tv' }
    ]
  },
  {
    label: 'fmhy',
    links: [
      { key: 'fm', label: 'fmhy net', url: 'https://fmhy.net' },
      { key: 'sx', label: 'searxng', url: 'https://searx.fmhy.net' }
    ]
  }
]

const mode = ref('light')

onMounted(() => {
  const html = document.documentElement
  const isDark = html.classList.contains('dark')
  const isAmoled = html.classList.contains('amoled')
  mode.value = isAmoled ? 'amoled' : isDark ? 'dark' : 'light'
})

function handleKeydown(e: KeyboardEvent) {
  if (e.key === '/' && document.activeElement !== input.value) {
    const tag = document.activeElement?.tagName
    if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
      e.preventDefault()
      input.value?.focus()
    }
    return
  }

  if (e.key === 'Escape') {
    input.value?.blur()
    query.value = ''
    historyIndex.value = -1
    return
  }

  if (document.activeElement !== input.value) return

  if (e.key === 'Enter') {
    const q = query.value.trim()
    if (q) {
      history.value.unshift(q)
      if (history.value.length > 50) history.value.pop()
      historyIndex.value = -1
      window.open(
        `https://searx.fmhy.net/search?q=${encodeURIComponent(q)}`,
        '_self'
      )
      query.value = ''
    }
    return
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (history.value.length === 0) return
    const next = historyIndex.value + 1
    if (next < history.value.length) {
      historyIndex.value = next
      query.value = history.value[next]
    }
    return
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (historyIndex.value <= 0) {
      historyIndex.value = -1
      query.value = ''
      return
    }
    historyIndex.value -= 1
    query.value = history.value[historyIndex.value]
    return
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="monotype">
    <div class="monotype-bar">
      <span class="monotype-bar-title">mono-type</span>
      <span class="monotype-bar-mode">{{ mode }}</span>
    </div>

    <main class="monotype-main">
      <div class="monotype-clock">{{ timeString }}</div>
      <div class="monotype-date">{{ dateString }}</div>

      <form class="monotype-prompt" @submit.prevent>
        <span class="monotype-prompt-char">$</span>
        <input
          ref="input"
          v-model="query"
          class="monotype-prompt-input"
          placeholder="search or type a command..."
        />
      </form>

      <div class="monotype-categories">
        <div
          v-for="cat in categories"
          :key="cat.label"
          class="monotype-category"
        >
          <div class="monotype-category-label">{{ cat.label }}</div>
          <div class="monotype-category-items">
            <a
              v-for="link in cat.links"
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
      </div>

      <div class="monotype-help">
        <span>
          <kbd>/</kbd>
          focus input
        </span>
        <span>
          <kbd>esc</kbd>
          clear
        </span>
        <span>
          <kbd>&uarr;</kbd>
          <kbd>&darr;</kbd>
          history
        </span>
        <span>
          <kbd>enter</kbd>
          search
        </span>
      </div>
    </main>
  </div>
</template>

<style>
.monotype {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-family:
    'JetBrains Mono', 'Fira Code', 'Consolas', 'Courier New', monospace;
}

.monotype-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--vp-c-text-3);
  font-size: 0.75rem;
  user-select: none;
}

.monotype-bar-title {
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.15em;
}

.monotype-bar-mode {
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.monotype-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  width: 100%;
  max-width: 42rem;
  margin: 0 auto;
}

.monotype-clock {
  font-size: clamp(3.5rem, 12vw, 6rem);
  font-weight: 200;
  letter-spacing: 0.12em;
  line-height: 1;
  color: var(--vp-c-text-1);
}

.monotype-date {
  font-size: 0.875rem;
  color: var(--vp-c-text-3);
  margin-top: 0.75rem;
  letter-spacing: 0.08em;
}

.monotype-prompt {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 3rem;
  width: 100%;
  max-width: 32rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--vp-c-text-3);
}

.monotype-prompt-char {
  color: var(--vp-c-text-3);
  font-size: 1rem;
  user-select: none;
}

.monotype-prompt-input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--vp-c-text-1);
  font-family: inherit;
  font-size: 1rem;
  flex: 1;
  min-width: 0;
  caret-color: var(--vp-c-text-1);
}

.monotype-prompt-input::placeholder {
  color: var(--vp-c-text-3);
  opacity: 0.4;
}

.monotype-categories {
  display: flex;
  gap: 3rem;
  margin-top: 3rem;
  flex-wrap: wrap;
  justify-content: center;
}

.monotype-category {
  min-width: 10rem;
}

.monotype-category-label {
  font-size: 0.6875rem;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin-bottom: 1rem;
}

.monotype-category-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.monotype-link {
  color: var(--vp-c-text-2);
  text-decoration: none;
  font-size: 0.875rem;
}

.monotype-link:hover {
  color: var(--vp-c-text-1);
}

.monotype-link-key {
  color: var(--vp-c-text-3);
  margin-right: 0.5rem;
}

.monotype-help {
  display: flex;
  gap: 1.5rem;
  margin-top: 3rem;
  flex-wrap: wrap;
  justify-content: center;
}

.monotype-help span {
  font-size: 0.6875rem;
  color: var(--vp-c-text-3);
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.monotype-help kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.2rem;
  height: 1.2rem;
  padding: 0 0.25rem;
  font-size: 0.625rem;
  border: 1px solid var(--vp-c-text-3);
  color: var(--vp-c-text-2);
  font-family: inherit;
}
</style>
