<script setup lang="ts">
import type { DisplayMode } from '../themes/types'
import { useData } from 'vitepress'
import { computed, inject, onMounted, onUnmounted, ref } from 'vue'
import { useTheme } from '../themes/themeHandler'
import { revealThemeChange } from '../themes/themeTransition'

const { mode, amoledEnabled, setAppearance } = useTheme()

// VitePress runs VueUse's `useDark` whenever `appearance` is enabled in config,
// and that re-applies the `.dark` class from its own storage key on every load.
// Keep its `isDark` in step with our handler so (a) consumers like Tag.vue read
// the right mode and (b) VueUse never fights our class on the next page load.
const { isDark } = useData()

const closeScreen = inject('close-screen', null) as (() => void) | null

const wrapperRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<{
  hide: (options?: { skipDelay?: boolean }) => void
} | null>(null)
const shown = ref(false)

interface ModeChoice {
  mode: DisplayMode
  label: string
  icon: string
  isAmoled?: boolean
}

const modeChoices: ModeChoice[] = [
  { mode: 'light', label: 'Light', icon: 'i-ph-sun-duotone' },
  { mode: 'dark', label: 'Dark', icon: 'i-ph-moon-duotone' },
  {
    mode: 'dark',
    label: 'AMOLED',
    icon: 'i-ph-moon-stars-duotone',
    isAmoled: true
  }
]

const currentChoice = computed(() => {
  const current = mode.value
  if (current === 'dark' && amoledEnabled.value) {
    return modeChoices[2] // AMOLED option
  }
  return (
    modeChoices.find((choice) => choice.mode === current && !choice.isAmoled) ||
    modeChoices[0]
  )
})

const selectMode = async (choice: ModeChoice, event?: MouseEvent) => {
  event?.stopPropagation()

  // Close every dropdown surface up front. `skipDelay` makes floating-vue
  // commit the hide synchronously rather than on its delayed timer, so the
  // popover is genuinely closed before the view transition snapshots the page
  // (otherwise it is only CSS-hidden during the reveal and pops back when the
  // transition restores the live DOM at the end).
  dropdownRef.value?.hide({ skipDelay: true })
  shown.value = false
  wrapperRef.value?.closest('.VPFlyout')?.classList.remove('open')
  closeScreen?.()

  if (isActiveChoice(choice)) {
    return
  }

  await revealThemeChange(event, choice.mode === 'dark', () => {
    if (choice.isAmoled) {
      setAppearance('dark', true)
    } else {
      setAppearance(choice.mode, false)
    }
    // Mirror into VitePress's appearance state (same value our handler just set,
    // so it's idempotent) so it persists and never reverts the class on reload.
    isDark.value = choice.mode === 'dark'
  })

  // The view transition restores the live DOM when it finishes; re-assert the
  // close so floating-vue can never leave the popover re-shown afterwards.
  dropdownRef.value?.hide({ skipDelay: true })
}

const isActiveChoice = (choice: ModeChoice) => {
  const current = mode.value
  if (choice.isAmoled) {
    return current === 'dark' && amoledEnabled.value
  }
  return choice.mode === current && !choice.isAmoled && !amoledEnabled.value
}

let cleanupFlyout: (() => void) | null = null
let parentOverrideTimeout: ReturnType<typeof setTimeout> | null = null

// Logic to override the parent VPFlyout behavior to be click-based
const setupParentFlyoutOverride = () => {
  // Tear down any previous setup so listeners don't accumulate on re-runs.
  if (cleanupFlyout) cleanupFlyout()

  if (!wrapperRef.value) return

  const flyout = wrapperRef.value.closest('.VPFlyout')
  if (!flyout) return

  // Add class to disable CSS hover via global style
  flyout.classList.add('click-based-flyout')

  // Find the toggle button
  const button = flyout.querySelector('button')
  if (!button) return

  // Click handler for toggle
  const toggleFlyout = () => {
    flyout.classList.toggle('open')
  }

  button.addEventListener('click', toggleFlyout)

  // Global click listener to close when clicking outside
  const closeFlyout = (e: MouseEvent) => {
    if (!flyout.contains(e.target as Node)) {
      flyout.classList.remove('open')
      shown.value = false
    }
  }

  document.addEventListener('click', closeFlyout)
  cleanupFlyout = () => {
    flyout.classList.remove('click-based-flyout')
    button.removeEventListener('click', toggleFlyout)
    document.removeEventListener('click', closeFlyout)
  }
}

onMounted(() => {
  // defer slightly to ensuring DOM is ready
  parentOverrideTimeout = setTimeout(setupParentFlyoutOverride, 100)
})

onUnmounted(() => {
  if (parentOverrideTimeout) {
    clearTimeout(parentOverrideTimeout)
  }
  if (cleanupFlyout) {
    cleanupFlyout()
  }
})
</script>

<template>
  <div ref="wrapperRef" class="theme-dropdown-wrapper">
    <VDropdown
      ref="dropdownRef"
      v-model:shown="shown"
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
        :aria-label="`Theme: ${currentChoice.label}`"
      >
        <ClientOnly>
          <!-- Swap the icon instantly (no out-in fade): during a theme change
               the navbar is frozen in the view-transition snapshot, and an
               out-in gap would freeze an empty icon for the whole reveal. A
               plain class swap keeps the new icon in the snapshot so it changes
               as the reveal wipes across. -->
          <div :class="[currentChoice.icon, 'text-xl']" />
        </ClientOnly>
      </button>

      <template #popper>
        <div class="theme-dropdown-content">
          <button
            v-for="(choice, index) in modeChoices"
            :key="index"
            v-close-popper
            class="theme-dropdown-item"
            :class="{ active: isActiveChoice(choice) }"
            @click="selectMode(choice, $event)"
          >
            <Transition name="fade" mode="out-in">
              <div :key="choice.label" :class="[choice.icon, 'text-lg']" />
            </Transition>
            <span>{{ choice.label }}</span>
            <div
              v-if="isActiveChoice(choice)"
              class="i-ph-check text-lg ml-auto"
            />
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
    background: var(--vp-c-bg);
    transition:
      color 0.25s,
      background 0.25s;
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
