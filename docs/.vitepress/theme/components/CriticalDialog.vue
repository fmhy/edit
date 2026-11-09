<script setup lang="ts">
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle
} from 'reka-ui'
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    title?: string
    noteId?: string
    contentHash?: string
    targetUrl?: string
  }>(),
  { noteId: '', contentHash: '', targetUrl: '' }
)

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'dismiss', id: string, hash: string): void
}>()

const dontShowAgain = ref(false)

const close = () => {
  dontShowAgain.value = false
  emit('close')
}

const confirm = () => {
  if (dontShowAgain.value && props.noteId) {
    emit('dismiss', props.noteId, props.contentHash)
  }
  close()
  if (props.targetUrl) {
    window.open(props.targetUrl, '_blank', 'noopener,noreferrer')
  }
}
</script>

<template>
  <DialogRoot
    :open="true"
    @update:open="
      ($open) => {
        if (!$open) close()
      }
    "
  >
    <DialogPortal>
      <DialogOverlay class="critical-backdrop" />
      <DialogContent class="critical-dialog">
        <DialogTitle class="critical-dialog-title">
          <span
            class="i-ph-warning-circle-duotone critical-dialog-icon"
            aria-hidden="true"
          />
          {{ title || 'Warning' }}
        </DialogTitle>

        <DialogDescription class="critical-dialog-text">
          Please read this before continuing.
        </DialogDescription>

        <div class="critical-dialog-body vp-doc">
          <slot />
        </div>

        <label class="critical-checkbox-group">
          <input
            v-model="dontShowAgain"
            type="checkbox"
            class="critical-checkbox"
          />
          <span class="critical-checkbox-label">Don't show again</span>
        </label>

        <div class="critical-dialog-actions">
          <button
            type="button"
            class="critical-dialog-btn critical-dialog-btn-secondary"
            @click="close"
          >
            Cancel
          </button>
          <button
            type="button"
            class="critical-dialog-btn critical-dialog-btn-primary"
            @click="confirm"
          >
            Continue
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped lang="scss">
.critical-backdrop {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: var(--vp-backdrop-bg-color);
  backdrop-filter: blur(8px);
}

.critical-dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 99999;
  width: calc(100% - 32px);
  max-width: 480px;
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 24px;
  background-color: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  box-shadow: var(--vp-shadow-3);
}

.critical-dialog-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  color: var(--vp-c-text-1);
  font-size: 18px;
  font-weight: 600;
  line-height: 24px;
}

.critical-dialog-icon {
  flex-shrink: 0;
  color: var(--fmhy-note-icon-warning);
}

.critical-dialog-text {
  margin: 0 0 12px;
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 18px;
}

.critical-dialog-body {
  margin: 0 0 16px;
  color: var(--vp-c-text-1);
  font-size: 14px;
  line-height: 1.6;

  :deep(a.tooltip-source-link) {
    color: inherit;
    text-decoration: none;
  }
}

.critical-checkbox-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 20px;
  padding-top: 16px;
  border-top: 1px solid var(--vp-c-divider);
  cursor: pointer;
}

.critical-checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--fmhy-note-icon-warning);
  cursor: pointer;
}

.critical-checkbox-label {
  color: var(--vp-c-text-2);
  font-size: 13px;
  cursor: pointer;
  user-select: none;
}

.critical-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.critical-dialog-btn {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  border-radius: 8px;
  cursor: pointer;
  transition:
    background-color 0.2s,
    border-color 0.2s,
    color 0.2s;

  &.critical-dialog-btn-secondary {
    color: var(--vp-button-alt-text);
    background-color: var(--vp-button-alt-bg);
    border: 1px solid var(--vp-c-divider);

    &:hover {
      color: var(--vp-button-alt-hover-text);
      background-color: var(--vp-button-alt-hover-bg);
    }
  }

  &.critical-dialog-btn-primary {
    color: var(--vp-button-brand-text);
    background-color: var(--vp-button-brand-bg);
    border: 1px solid var(--vp-button-brand-border);

    &:hover {
      opacity: 0.8;
    }
  }
}

.critical-dialog-btn:focus-visible,
.critical-checkbox:focus-visible {
  outline: 2px solid var(--fmhy-note-icon-warning);
  outline-offset: 2px;
}

.critical-backdrop[data-state='open'],
.critical-dialog[data-state='open'] {
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
