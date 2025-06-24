<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import Clock from './Clock.vue'

export interface PlatformType {
  name: string
  key: string
  url: string
  icon?: string
  color?: string
}

const props = defineProps<{
  onFocusChange: (focused: boolean) => void
  initialQuery?: string
}>()

const platforms: PlatformType[] = [
  {
    name: 'SearXNG',
    key: 'a',
    url: 'https://searx.fmhy.net/search?q=',
    icon: 'i-simple-icons:searxng'
  },
  {
    name: 'ChatGPT',
    key: 's',
    url: 'https://chat.openai.com/?q=',
    icon: 'i-simple-icons:openai'
  },
  {
    name: 'Claude',
    key: 'd',
    url: 'https://claude.ai/chat/',
    icon: 'i-logos:claude-icon'
  },
  {
    name: 'Perplexity',
    key: 'f',
    url: 'https://www.perplexity.ai/search?q=',
    icon: 'i-logos:perplexity-icon'
  }
]

const inputRef = ref<HTMLInputElement | null>(null)
const query = ref(props.initialQuery ?? '')
const isInputFocused = ref(false)
const showShortcuts = ref(false)

function handleInputFocus() {
  isInputFocused.value = true
  props.onFocusChange(true)
}

function handleInputBlur() {
  isInputFocused.value = false
  props.onFocusChange(false)
}

function handleSubmit() {
  if (!query.value.trim()) return
  const google = platforms.find((p) => p.name === 'SearX') || platforms[0]
  if (google)
    window.open(google.url + encodeURIComponent(query.value.trim()), '_self')
}

function handlePlatformClick(platform: PlatformType) {
  if (!query.value.trim()) return
  window.open(platform.url + encodeURIComponent(query.value.trim()), '_self')
}

function platformClass() {
  const base =
    'widget-card group relative widget-button rounded-md bg-bg-elv p-2 border transition-transform'
  const disabled = !query.value.trim()
  const highlight = showShortcuts.value && isInputFocused.value
  return [
    base,
    disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
    highlight ? 'border-2 border-primary scale-105' : 'border-div'
  ].join(' ')
}

onMounted(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const active = document.activeElement
    const isSearchFocused = inputRef.value === active

    if (e.key === '/' && !isSearchFocused) {
      const typingInInput =
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          (active instanceof HTMLElement && active.isContentEditable))
      if (!typingInInput) {
        e.preventDefault()
        inputRef.value?.focus()
      }
      return
    }

    if (isInputFocused.value && e.altKey) {
      const key = e.key.toLowerCase()
      let platform = platforms.find((p) => p.key === key)

      if (!platform && e.code.startsWith('Key') && e.code.length === 4) {
        const codeKey = e.code.slice(3).toLowerCase()
        platform = platforms.find((p) => p.key === codeKey)
      }

      if (platform && query.value.trim()) {
        e.preventDefault()
        window.open(
          platform.url + encodeURIComponent(query.value.trim()),
          '_self'
        )
      }
    }

    if (e.altKey) showShortcuts.value = true
  }

  const handleKeyUp = (e: KeyboardEvent) => {
    if (!e.altKey) showShortcuts.value = false
  }

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
  })
})
</script>

<template>
  <div class="flex flex-col items-start w-full space-y-4 antialiased">
    <Clock />

    <form @submit.prevent="handleSubmit" class="relative w-full">
      <div class="relative">
        <i
          class="i-lucide-search absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-2"
        />
        <input
          ref="inputRef"
          v-model="query"
          @focus="handleInputFocus"
          @blur="handleInputBlur"
          placeholder="What would you like to search for?"
          class="w-full pl-10 pr-3 py-3 text-lg rounded-md shadow-sm transition-colors bg-bg-elv text-text border-2 outline-none border-div hover:border-primary"
        />
      </div>
    </form>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full">
      <button
        v-for="platform in platforms"
        :key="platform.name"
        :disabled="!query.trim()"
        @click="handlePlatformClick(platform)"
        :class="platformClass()"
        :style="platform.color ? { borderColor: platform.color } : {}"
      >
        <div class="flex items-center gap-2">
          <i
            v-if="platform.icon"
            :class="`w-5 h-5 ${platform.icon}`"
            :style="platform.color ? { color: platform.color } : {}"
          />
          <div class="text-left flex-grow">
            <h3 class="font-semibold truncate">{{ platform.name }}</h3>
          </div>
          <div
            class="hidden sm:flex items-center gap-1 text-xs ml-auto text-white"
          >
            <kbd
              class="bg-bg border border-div px-1 py-0.5 rounded text-sm font-semibold"
            >
              Alt
            </kbd>
            <span class="text-white font-semibold">+</span>
            <kbd
              class="bg-bg border border-div px-1 py-0.5 rounded text-sm font-semibold"
            >
              {{ platform.key.toUpperCase() }}
            </kbd>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>
