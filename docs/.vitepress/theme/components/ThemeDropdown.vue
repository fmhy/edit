<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTheme } from '../themes/themeHandler'
import type { DisplayMode } from '../themes/types'

const { mode, setMode, state, amoledEnabled, setAmoledEnabled } = useTheme()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

interface ModeChoice {
  mode: DisplayMode
  label: string
  icon: string
  isAmoled?: boolean
}

const modeChoices: ModeChoice[] = [
  { mode: 'light', label: 'Light', icon: 'i-ph-sun-duotone' },
  { mode: 'dark', label: 'Dark', icon: 'i-ph-moon-duotone' },
  { mode: 'dark', label: 'AMOLED', icon: 'i-ph-moon-stars-duotone', isAmoled: true },
  { mode: 'monochrome', label: 'Monochrome', icon: 'i-ph-circle-half-tilt-duotone' }
]

const currentChoice = computed(() => {
  const current = (mode && (mode as any).value) ? (mode as any).value : 'light'
  if (current === 'monochrome') {
    return modeChoices[3] // Monochrome option
  }
  if (current === 'dark' && amoledEnabled.value) {
    return modeChoices[2] // AMOLED option
  }
  return modeChoices.find(choice => choice.mode === current && !choice.isAmoled) || modeChoices[0]
})

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const selectMode = (choice: ModeChoice) => {
  setMode(choice.mode)
  
  if (choice.isAmoled) {
    setAmoledEnabled(true)
  } else {
    // Only disable AMOLED if we are explicitly switching away from it
    // But wait, if we switch to 'monochrome', 'amoled' flag might still be true?
    // It doesn't matter because amoled is only checked if mode is 'dark'.
    // However, if we switch back to 'dark', should it be amoled or not?
    // Standard behavior: clicking 'Dark' (non-amoled) disables amoled.
    if (choice.mode === 'dark') {
       setAmoledEnabled(false)
    }
  }
  isOpen.value = false
}

const isActiveChoice = (choice: ModeChoice) => {
  const current = (mode && (mode as any).value) ? (mode as any).value : 'light'
  if (choice.mode === 'monochrome') {
     return current === 'monochrome'
  }
  if (choice.isAmoled) {
    return current === 'dark' && amoledEnabled.value
  }
  return choice.mode === current && !choice.isAmoled && !amoledEnabled.value
}

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="dropdownRef" class="theme-dropdown">
    <button
      type="button"
      class="theme-dropdown-toggle"
      :title="currentChoice.label"
      @click="toggleDropdown"
    >
      <ClientOnly>
        <div :class="[currentChoice.icon, 'text-xl']" />
      </ClientOnly>
    </button>

    <Transition name="dropdown">
      <div v-if="isOpen" class="theme-dropdown-menu">
        <button
          v-for="(choice, index) in modeChoices"
          :key="index"
          class="theme-dropdown-item"
          :class="{ active: isActiveChoice(choice) }"
          @click="selectMode(choice)"
        >
          <div :class="[choice.icon, 'text-lg']" />
          <span>{{ choice.label }}</span>
          <div v-if="isActiveChoice(choice)" class="i-ph-check text-lg ml-auto" />
        </button>
      </div>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
.theme-dropdown {
  position: relative;
  display: inline-block;
}

.theme-dropdown-toggle {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 36px;
  height: 36px;
  color: var(--vp-c-text-2);
  transition: color 0.5s;
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: 8px;

  &:hover {
    color: var(--vp-c-text-1);
    background: var(--vp-c-bg-elv);
    transition: color 0.25s, background 0.25s;
  }
}

.theme-dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 180px;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  padding: 6px;
  z-index: 1000;
  backdrop-filter: blur(12px);

  .dark & {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }
}

.theme-dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: background 0.2s;
  font-size: 14px;
  text-align: left;

  &:hover {
    background: var(--vp-c-bg);
  }

  &.active {
    color: var(--vp-c-brand-1);
    font-weight: 500;
  }

  span {
    flex: 1;
  }
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
