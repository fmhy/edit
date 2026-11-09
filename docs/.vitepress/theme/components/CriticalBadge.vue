<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import { withBase } from 'vitepress'
import { computed, onMounted, ref } from 'vue'
import { registerCriticalNote } from '../composables/criticalRegistry'

const props = withDefaults(
  defineProps<{ title?: string; noteId?: string; contentHash?: string }>(),
  { noteId: '', contentHash: '' }
)

const shown = ref(false)

// Same glyph as normal notes (note.svg); only the colour differs.
const resolvedIcon = computed(() => withBase('/note.svg'))

const isHoverable = useMediaQuery('(hover: hover)')
const triggers = computed(() => (isHoverable.value ? ['hover'] : ['click']))

onMounted(() => {
  if (!props.noteId) return
  // Register the note body for Layout.vue's modal dialog (shown when the
  // main entry link is clicked). Uses the hidden duplicate slot, which is
  // always in the DOM even when the popover is teleported/closed.
  const el = document.querySelector(
    `[data-note-id="${CSS.escape(props.noteId)}"] .critical-badge-hidden-body`
  )
  if (el) {
    registerCriticalNote(props.noteId, props.title ?? '', el.innerHTML)
  }
})
</script>

<template>
  <span
    class="critical-badge-wrap"
    :data-note-id="noteId"
    :data-content-hash="contentHash"
    :data-title="title"
  >
    <VDropdown
      v-model:shown="shown"
      :triggers="triggers"
      :popper-triggers="triggers"
      :delay="{ show: 50, hide: 50 }"
      :auto-hide="true"
      :distance="15"
      placement="auto"
    >
      <button
        type="button"
        :aria-label="title ? `Warning: ${title}` : 'More information'"
        aria-haspopup="dialog"
        :aria-expanded="shown"
        class="warning-note-trigger relative inline-flex items-center justify-center leading-none p-0 select-none font-bold cursor-pointer h-[1.5em] w-[1.5em] overflow-visible align-middle"
        @click.stop
      >
        <span
          class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1.2em] h-[1.2em] bg-current transition-all"
          :style="{
            mask: `url(${resolvedIcon}) no-repeat center / contain`,
            '-webkit-mask': `url(${resolvedIcon}) no-repeat center / contain`
          }"
          aria-hidden="true"
        />
      </button>

      <template #popper>
        <div class="critical-popover-card" role="dialog">
          <div class="critical-popover-content">
            <h3 v-if="title" class="critical-popover-title" v-text="title" />
            <div class="critical-popover-body vp-doc">
              <slot />
            </div>
          </div>
        </div>
      </template>
    </VDropdown>
    <!-- Hidden duplicate of the note body so Layout.vue can populate the
         modal dialog without depending on the popover's teleported DOM. -->
    <span class="critical-badge-hidden-body" aria-hidden="true">
      <slot />
    </span>
  </span>
</template>

<style scoped lang="scss">
.critical-badge-wrap {
  display: inline-flex;
  vertical-align: middle;
}

.warning-note-trigger {
  /* Same size/shape as normal note icons; fixed red so it reads as a warning
     regardless of the active theme. */
  color: var(--fmhy-note-icon-warning);
  transition: color 0.2s;

  &:hover {
    color: var(--fmhy-note-icon-warning-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--fmhy-note-icon-warning);
    outline-offset: 2px;
    border-radius: 2px;
  }

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

.critical-badge-hidden-body {
  display: none;
}

.critical-popover-card {
  display: flex;
  flex-direction: column;
  max-width: min(28rem, calc(100vw - 32px));
  max-height: min(28rem, calc(100dvh - 32px));
  overflow: hidden;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  box-shadow: var(--vp-shadow-3);
}

.critical-popover-content {
  padding: 16px;
  overflow-y: auto;
}

.critical-popover-title {
  margin: 0 0 8px;
  color: var(--vp-c-text-1);
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
}

.critical-popover-body {
  color: var(--vp-c-text-1);
  font-size: 14px;
  line-height: 1.6;

  :deep(a.tooltip-source-link) {
    color: inherit;
    text-decoration: none;
  }
}
</style>
