<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import { withBase } from 'vitepress'
import { computed } from 'vue'

const props = withDefaults(defineProps<{ title?: string; icon?: string }>(), {
  icon: '/note.svg'
})

const resolvedIcon = computed(() => withBase(props.icon))

const isHoverable = useMediaQuery('(hover: hover)')
const triggers = computed(() => (isHoverable.value ? ['hover'] : ['click']))
</script>

<template>
  <VDropdown
    :triggers="triggers"
    :popper-triggers="triggers"
    :delay="{ show: 50, hide: 50 }"
    :auto-hide="true"
    :distance="15"
    placement="auto"
  >
    <button
      type="button"
      :aria-label="title || 'More information'"
      class="tooltip-trigger text-primary relative inline-flex items-center justify-center leading-none p-0 select-none font-bold cursor-pointer transition-all h-[1.5em] w-[1.5em] overflow-visible align-middle"
    >
      <div
        class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1.2em] h-[1.2em] bg-current transition-all"
        :style="{
          mask: `url(${resolvedIcon}) no-repeat center / contain`,
          '-webkit-mask': `url(${resolvedIcon}) no-repeat center / contain`
        }"
      />
    </button>

    <template #popper>
      <div class="tooltip-card">
        <div class="tooltip-content">
          <h3 v-if="title" class="tooltip-title" v-text="title" />
          <div class="tooltip-body vp-doc">
            <slot />
          </div>
        </div>
      </div>
    </template>
  </VDropdown>
</template>

<style scoped lang="scss">
.tooltip-trigger {
  @media (pointer: coarse) {
    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      min-width: 36px;
      min-height: 36px;
    }
  }
}

.tooltip-card {
  display: flex;
  flex-direction: column;
  max-width: min(28rem, calc(100vw - 32px));
  max-height: min(28rem, calc(100dvh - 32px));
  overflow: hidden;
}

.tooltip-content {
  padding: 16px;
  overflow-y: auto;
}

.tooltip-title {
  margin: 0 0 8px;
  color: var(--vp-c-text-1);
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
}

.tooltip-body {
  color: var(--vp-c-text-1);
  font-size: 14px;
  line-height: 1.6;

  :deep(a.tooltip-source-link) {
    color: inherit;
    text-decoration: none;
  }
}
</style>

<style>
.v-popper__popper {
  --uno: z-5000;
}
.v-popper {
  display: inline-flex !important;
}

.v-popper--theme-dropdown .v-popper__inner {
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
  padding: 0 !important;
}
</style>
