<script setup lang="ts">
import { withBase } from 'vitepress'
import { computed } from 'vue'
import { useMediaQuery } from '@vueuse/core'

const props = withDefaults(
  defineProps<{ title?: string; icon?: string }>(),
  { icon: '/note.svg' }
)

const resolvedIcon = computed(() => withBase(props.icon))

const isHoverable = useMediaQuery('(hover: hover)')
const triggers = computed(() => isHoverable.value ? ['hover'] : ['click'])
</script>

<template>
  <VDropdown :triggers="triggers" :popper-triggers="triggers" :delay="{ show: 50, hide: 50 }" :auto-hide="true" :distance="15" placement="auto">
    <button
      aria-label="Tooltip"
      class="text-brand-1 relative inline-flex align-middle items-center justify-center leading-none p-0 select-none font-bold cursor-pointer transition-all h-[1.2em] w-[1.5em]"
    >
      <div
        class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1.2 w-[1.3em] h-[1.3em] bg-current transition-all"
        :style="{
           mask: `url(${resolvedIcon}) no-repeat center / contain`,
           '-webkit-mask': `url(${resolvedIcon}) no-repeat center / contain`,
        }"
      />
    </button>

    <template #popper>
      <div class="border-$vp-c-divider bg-$vp-c-bg-alt b-rd-4 max-w-md max-h-md border-2 border-solid flex flex-col transition-all overflow-hidden">
        <div class="overflow-y-auto p-4">
          <h3 v-if="title" class="text-$vp-c-text-1 mb-2 text-lg font-semibold" v-text="title" />
          <div class="text-$vp-c-text-1 text-sm content vp-doc">
            <slot />
          </div>
        </div>
      </div>
    </template>
  </VDropdown>
</template>

<style>
.v-popper__popper { --uno: z-5000; }
.v-popper { display: inline-flex !important; }

.v-popper--theme-dropdown .v-popper__inner {
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
  padding: 0 !important;
}

.vp-doc a.tooltip-source-link {
  color: inherit;
  text-decoration: none;
}
</style>
