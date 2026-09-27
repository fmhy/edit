<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import AppearancePanel from './AppearancePanel.vue'

const dropdownRef = ref<{
  hide: (options?: { skipDelay?: boolean }) => void
} | null>(null)
const shown = ref(false)

const closeDropdown = () => {
  dropdownRef.value?.hide({ skipDelay: true })
  shown.value = false
}

let desktopMedia: MediaQueryList | null = null
const handleResponsiveLayoutChange = () => {
  closeDropdown()
}

onMounted(() => {
  desktopMedia = window.matchMedia('(min-width: 1280px)')
  desktopMedia.addEventListener('change', handleResponsiveLayoutChange)
})

onUnmounted(() => {
  desktopMedia?.removeEventListener('change', handleResponsiveLayoutChange)
})
</script>

<template>
  <div class="theme-dropdown-wrapper">
    <div class="compact-theme-picker">
      <AppearancePanel />
    </div>

    <div class="desktop-theme-picker">
      <VDropdown
        ref="dropdownRef"
        v-model:shown="shown"
        class="theme-dropdown"
        theme="theme-selector"
        :distance="12"
        placement="bottom-end"
        :triggers="['click']"
        :popper-triggers="[]"
        :auto-hide="true"
      >
        <button
          type="button"
          class="theme-dropdown-toggle"
          title="Appearance and themes"
          aria-label="Appearance and themes"
        >
          <ClientOnly>
            <div class="i-ph-palette-duotone text-xl" />
          </ClientOnly>
        </button>

        <template #popper>
          <AppearancePanel />
        </template>
      </VDropdown>
    </div>
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

.desktop-theme-picker {
  display: flex;
  align-items: center;
  height: 100%;
}

.compact-theme-picker {
  display: none;
}

.theme-dropdown-toggle {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 36px;
  height: 36px;
  color: var(--vp-c-text-2);
  transition:
    color 0.25s,
    background-color 0.25s;
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: 8px;

  &:hover {
    color: var(--vp-c-text-1);
    background: var(--vp-c-default-soft);
  }
}

@media (max-width: 1279px) {
  .theme-dropdown-wrapper {
    display: block;
    width: 100%;
    height: auto;
  }

  .desktop-theme-picker {
    display: none;
  }

  .compact-theme-picker {
    display: block;
    min-width: 0;
    width: 100%;
  }
}
</style>
