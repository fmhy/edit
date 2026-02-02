<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useTheme } from '../themes/themeHandler'
import type { DisplayMode } from '../themes/types'

const { mode, amoledEnabled, setAppearance } = useTheme()

const wrapperRef = ref<HTMLElement | null>(null)

interface ModeChoice {
  mode: DisplayMode
  label: string
  icon: string
  isAmoled?: boolean
}

const modeChoices: ModeChoice[] = [
  { mode: 'light', label: 'Light', icon: 'i-ph-sun-duotone' },
  { mode: 'dark', label: 'Dark', icon: 'i-ph-moon-duotone' },
  { mode: 'dark', label: 'AMOLED', icon: 'i-ph-moon-stars-duotone', isAmoled: true }
]

const currentChoice = computed(() => {
  const current = (mode && (mode as any).value) ? (mode as any).value : 'light'
  if (current === 'dark' && amoledEnabled.value) {
    return modeChoices[2] // AMOLED option
  }
  return modeChoices.find(choice => choice.mode === current && !choice.isAmoled) || modeChoices[0]
})

const selectMode = (choice: ModeChoice) => {
  if (choice.isAmoled) {
    setAppearance('dark', true)
  } else {
    setAppearance(choice.mode, false)
  }
}

const isActiveChoice = (choice: ModeChoice) => {
  const current = (mode && (mode as any).value) ? (mode as any).value : 'light'
  if (choice.isAmoled) {
    return current === 'dark' && amoledEnabled.value
  }
  return choice.mode === current && !choice.isAmoled && !amoledEnabled.value
}

// Logic to override the parent VPFlyout behavior to be click-based
const setupParentFlyoutOverride = () => {
  if (!wrapperRef.value) return

  const flyout = wrapperRef.value.closest('.VPFlyout')
  if (!flyout) return

  // Add class to disable CSS hover via global style
  flyout.classList.add('click-based-flyout')

  // Find the toggle button
  const button = flyout.querySelector('button')
  if (!button) return

  // Click handler for toggle
  const toggleFlyout = (e: MouseEvent) => {
    flyout.classList.toggle('open')
  }

  button.addEventListener('click', toggleFlyout)

  // Global click listener to close when clicking outside
  const closeFlyout = (e: MouseEvent) => {
    if (!flyout.contains(e.target as Node)) {
      flyout.classList.remove('open')
    }
  }

  document.addEventListener('click', closeFlyout)

  ;(wrapperRef.value as any)._cleanup = () => {
    flyout.classList.remove('click-based-flyout')
    button.removeEventListener('click', toggleFlyout)
    document.removeEventListener('click', closeFlyout)
  }
}

onMounted(() => {
  // defer slightly to ensuring DOM is ready
  setTimeout(setupParentFlyoutOverride, 100)
})

onUnmounted(() => {
  if (wrapperRef.value && (wrapperRef.value as any)._cleanup) {
    ;(wrapperRef.value as any)._cleanup()
  }
})
</script>

<template>
  <div ref="wrapperRef" class="theme-dropdown-wrapper">
    <VDropdown 
        class="theme-dropdown" 
        theme="theme-selector"
        :distance="12" 
        placement="bottom-end" 
        :triggers="['click']"
        :popper-triggers="['click']"
        :auto-hide="true"
    >
        <button
        type="button"
        class="theme-dropdown-toggle"
        :title="currentChoice.label"
        >
        <ClientOnly>
          <Transition name="fade" mode="out-in">
            <div :key="currentChoice.label" :class="[currentChoice.icon, 'text-xl']" />
          </Transition>
        </ClientOnly>
        </button>

        <template #popper>
        <div class="theme-dropdown-content">
            <button
            v-for="(choice, index) in modeChoices"
            :key="index"
            class="theme-dropdown-item"
            :class="{ active: isActiveChoice(choice) }"
            @click="selectMode(choice)"
            v-close-popper
            >
            <Transition name="fade" mode="out-in">
              <div :key="choice.label" :class="[choice.icon, 'text-lg']" />
            </Transition>
            <span>{{ choice.label }}</span>
            <div v-if="isActiveChoice(choice)" class="i-ph-check text-lg ml-auto" />
            </button>
        </div>
        </template>
    </VDropdown>
  </div>
</template>

<style lang="scss" scoped>
.theme-dropdown-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
}

.theme-dropdown {
  display: flex;
  align-items: center;
  height: 100%;
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
    backdrop-filter: blur(12px);
  }
}

.theme-dropdown-content {
  min-width: 180px;
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
