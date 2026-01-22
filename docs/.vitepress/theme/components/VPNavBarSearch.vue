<script setup lang="ts">
import '@docsearch/css'
import { useLocalStorage } from '@vueuse/core'
import {
  onMounted,
  onUnmounted,
  ref,
  watch
} from 'vue'
import { useData } from 'vitepress'
import VPNavBarSearchButton from 'vitepress/dist/client/theme-default/components/VPNavBarSearchButton.vue'
import VPLocalSearchBox from './VPLocalSearchBox.vue'
import VPAlgoliaSearchBox from 'vitepress/dist/client/theme-default/components/VPAlgoliaSearchBox.vue'

const { theme } = useData()

// State for search provider. Default to Algolia as requested ('first').
const provider = useLocalStorage('vitepress:search-provider', 'algolia')

// Toggle function
function toggleProvider() {
  provider.value = provider.value === 'algolia' ? 'local' : 'algolia'
}

// Algolia preconnect logic
const loaded = ref(false)
const actuallyLoaded = ref(false)

const preconnect = () => {
  const id = 'VPAlgoliaPreconnect'
  const rIC = window.requestIdleCallback || setTimeout
  rIC(() => {
    const preconnect = document.createElement('link')
    preconnect.id = id
    preconnect.rel = 'preconnect'
    const algoliaConfig = theme.value.search?.options ?? theme.value.algolia
    if (algoliaConfig) {
      preconnect.href = `https://${algoliaConfig.appId}-dsn.algolia.net`
      preconnect.crossOrigin = ''
      document.head.appendChild(preconnect)
    }
  })
}

onMounted(() => {
  if (provider.value === 'algolia') {
    preconnect()
  }
})

// Hotkeys
const showSearch = ref(false)

const handleSearchHotKey = (event: KeyboardEvent) => {
  if (
    (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) ||
    (!isEditingContent(event) && event.key === '/')
  ) {
    event.preventDefault()
    if (provider.value === 'algolia') {
      load()
    } else {
      showSearch.value = true
    }
  }
}

function load() {
  if (!loaded.value) {
    loaded.value = true
    setTimeout(poll, 16)
  }
}

function poll() {
  if (provider.value !== 'algolia') return

  const e = new Event('keydown') as any
  e.key = 'k'
  e.metaKey = true
  window.dispatchEvent(e)
  setTimeout(() => {
    if (!document.querySelector('.DocSearch-Modal')) {
      poll()
    }
  }, 16)
}

function isEditingContent(event: KeyboardEvent): boolean {
  const element = event.target as HTMLElement
  const tagName = element.tagName
  return (
    element.isContentEditable ||
    tagName === 'INPUT' ||
    tagName === 'SELECT' ||
    tagName === 'TEXTAREA'
  )
}

onMounted(() => {
  window.addEventListener('keydown', handleSearchHotKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleSearchHotKey)
})

watch(provider, (newP) => {
  if (newP === 'algolia') {
    preconnect()
  }
})

</script>

<template>
  <div class="VPNavBarSearch">
    <!-- Toggle Button -->
    <div class="search-provider-toggle">
       <button @click="toggleProvider" class="toggle-btn" :title="provider === 'algolia' ? 'Switch to Local Search' : 'Switch to Algolia'">
         <span v-if="provider === 'algolia'" class="icon-algolia" aria-label="Algolia"></span>
         <span v-else class="icon-local" aria-label="Local">L</span>
       </button>
    </div>

    <template v-if="provider === 'local'">
      <VPLocalSearchBox
        v-if="showSearch"
        @close="showSearch = false"
      />
      <div id="local-search">
        <VPNavBarSearchButton @click="showSearch = true" />
      </div>
    </template>

    <template v-else-if="provider === 'algolia'">
      <VPAlgoliaSearchBox
        v-if="loaded"
        :algolia="theme.search?.options ?? theme.algolia"
        @vue:beforeMount="actuallyLoaded = true"
      />
      <div v-if="!actuallyLoaded" id="docsearch">
        <VPNavBarSearchButton @click="load" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.VPNavBarSearch {
  display: flex;
  align-items: center;
  gap: 8px; /* Space between toggle and search button */
}

@media (min-width: 768px) {
  .VPNavBarSearch {
    flex-grow: 1;
    padding-left: 24px;
  }
}

@media (min-width: 960px) {
  .VPNavBarSearch {
    padding-left: 32px;
  }
}

.search-provider-toggle button.toggle-btn {
    opacity: 0.5;
    padding: 6px;
    border-radius: 4px;
    cursor: pointer;
    background: transparent;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
}

.search-provider-toggle button.toggle-btn:hover {
    opacity: 1;
    background-color: var(--vp-c-bg-soft);
}

.icon-algolia {
  display: block;
  width: 18px;
  height: 18px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%235468FF' d='M12.004 0C5.385 0 0 5.373 0 12c0 6.613 5.372 12 11.987 12h.017c6.613 0 12-5.373 12-12 0-6.613-5.373-12-12-12zm2.553 14.125h-1.67V8.583l-3.328 5.76H7.9l4.477-7.79h1.68v5.542l3.327-5.76h1.663l-4.49 7.79z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
}

.icon-local {
    display: block;
    width: 18px;
    height: 18px;
    text-align: center;
    line-height: 18px;
    font-weight: bold;
    color: var(--vp-c-text-1);
    font-family: var(--vp-font-family-mono);
}
</style>
