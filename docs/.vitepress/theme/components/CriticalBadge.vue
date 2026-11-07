<script setup lang="ts">
import { withBase } from 'vitepress'
import { computed, nextTick, onMounted, ref } from 'vue'
import { registerCriticalNote } from '../composables/criticalRegistry'

const props = withDefaults(
  defineProps<{ title?: string; noteId?: string; contentHash?: string }>(),
  { noteId: '', contentHash: '' }
)

const shown = ref(false)

const triggerRef = ref<HTMLElement | null>(null)
const resolvedIcon = computed(() => withBase('/critical.svg'))

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

const onClose = () => {
  shown.value = false
  nextTick(() => triggerRef.value?.focus())
}
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
      :triggers="['click']"
      :popper-triggers="['click']"
      :auto-hide="true"
      :distance="15"
      placement="auto"
    >
      <button
        ref="triggerRef"
        type="button"
        :aria-label="title ? `Critical: ${title}` : 'Critical note'"
        aria-haspopup="dialog"
        :aria-expanded="shown"
        class="critical-badge"
        @click.stop
      >
        <span
          class="critical-badge-icon"
          :style="{
            mask: `url(${resolvedIcon}) no-repeat center / contain`,
            '-webkit-mask': `url(${resolvedIcon}) no-repeat center / contain`
          }"
          aria-hidden="true"
        />
        <span class="critical-badge-text">Critical</span>
      </button>

      <template #popper>
        <div class="critical-popover-card" role="dialog">
          <div class="critical-popover-content">
            <h3 v-if="title" class="critical-popover-title" v-text="title" />
            <div class="critical-popover-body vp-doc">
              <slot />
            </div>
            <div class="critical-popover-actions">
              <button
                type="button"
                class="critical-popover-btn"
                @click="onClose"
              >
                Close
              </button>
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

.critical-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--vp-custom-block-danger-border);
  background: var(--vp-custom-block-danger-bg);
  color: var(--vp-custom-block-danger-text);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
  vertical-align: middle;
  white-space: nowrap;
  cursor: pointer;
  transition: opacity 0.2s;
}

.critical-badge:hover {
  opacity: 0.8;
  color: var(--vp-custom-block-danger-text-deep);
}

.critical-badge:focus-visible {
  outline: 2px solid var(--vp-custom-block-danger-border);
  outline-offset: 2px;
}

.critical-badge-icon {
  width: 11px;
  height: 11px;
  background-color: currentColor;
  flex-shrink: 0;
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
  border: 1px solid var(--vp-custom-block-danger-border);
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

.critical-popover-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.critical-popover-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.critical-popover-btn:hover {
  opacity: 0.8;
}

.critical-popover-btn:focus-visible {
  outline: 2px solid var(--vp-custom-block-danger-border);
  outline-offset: 2px;
}

@media (forced-colors: active) {
  .critical-badge {
    outline: 1px solid;
  }
}
</style>
