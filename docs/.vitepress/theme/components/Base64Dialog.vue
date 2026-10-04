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

const props = defineProps<{
  show: boolean
  url: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const dontShowAgain = ref(false)

const close = () => {
  dontShowAgain.value = false
  emit('close')
}

const openLink = () => {
  if (dontShowAgain.value) {
    localStorage.setItem('fmhy-base64-dialog-preference', 'true')
  }
  window.open(props.url, '_blank', 'noopener,noreferrer')
  close()
}
</script>

<template>
  <DialogRoot
    :open="show"
    @update:open="
      ($open) => {
        if (!$open) close()
      }
    "
  >
    <DialogPortal>
      <DialogOverlay class="dialog-backdrop" />
      <DialogContent class="dialog-content">
        <DialogTitle class="dialog-title">
          <span
            class="i-ph-info-duotone dialog-icon w-5 h-5"
            aria-hidden="true"
          />
          Base64 Link
        </DialogTitle>

        <DialogDescription class="dialog-text">
          This link is Base64 encoded and needs to be decoded before use.
        </DialogDescription>

        <div>
          <p class="dialog-text dialog-text-subtitle">
            To decode it, you can use:
          </p>
          <ul class="dialog-list">
            <li>
              An online tool:
              <a
                href="https://www.base64decode.org/"
                target="_blank"
                rel="noreferrer"
                class="dialog-link"
              >
                Base64 Decode
              </a>
            </li>
            <li>
              A userscript:
              <a
                href="https://greasyfork.org/en/scripts/485772-fmhy-base64-auto-decoder"
                target="_blank"
                rel="noreferrer"
                class="dialog-link"
              >
                FMHY Base64 Auto Decoder
              </a>
              (using a
              <a
                href="/internet-tools#userscripts"
                target="_blank"
                class="dialog-link"
              >
                userscript manager
              </a>
              )
            </li>
          </ul>

          <p class="dialog-footer-hint">
            For more options:
            <a
              href="/text-tools#encode-decode"
              target="_blank"
              class="dialog-link"
            >
              Base64 Decoders
            </a>
          </p>
        </div>

        <label class="dialog-checkbox-group">
          <input
            v-model="dontShowAgain"
            type="checkbox"
            class="dialog-checkbox"
          />
          <span class="dialog-checkbox-label">Don't show again</span>
        </label>

        <div class="dialog-actions">
          <button
            type="button"
            class="dialog-btn dialog-btn-secondary"
            @click="close"
          >
            Cancel
          </button>
          <button
            type="button"
            class="dialog-btn dialog-btn-primary"
            @click="openLink"
          >
            Open Link
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped lang="scss">
.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: var(--vp-backdrop-bg-color);
  backdrop-filter: blur(8px);
}

.dialog-content {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 99999;
  width: calc(100% - 32px);
  max-width: 440px;
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 24px;
  background-color: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  box-shadow: var(--vp-shadow-3);
}

.dialog-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  color: var(--vp-c-text-1);
  font-size: 18px;
  font-weight: 600;
  line-height: 24px;
}

.dialog-icon {
  flex-shrink: 0;
  color: var(--vp-c-brand-1);
}

.dialog-text {
  margin: 0 0 12px;
  color: var(--vp-c-text-1);
  font-size: 14px;
  line-height: 20px;

  &.dialog-text-subtitle {
    margin-bottom: 6px;
  }
}

.dialog-list {
  margin: 0 0 16px;
  padding-left: 20px;
  color: var(--vp-c-text-1);
  font-size: 14px;
  line-height: 22px;
  list-style-type: disc;

  li {
    margin-bottom: 4px;
  }
}

.dialog-link {
  color: var(--vp-c-brand-1);
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 0.2s;

  &:hover {
    color: var(--vp-c-brand-2);
  }
}

.dialog-footer-hint {
  margin: 0 0 16px;
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 18px;
}

.dialog-checkbox-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 20px;
  padding-top: 16px;
  border-top: 1px solid var(--vp-c-divider);
  cursor: pointer;
}

.dialog-checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--vp-c-brand-1);
  cursor: pointer;
}

.dialog-checkbox-label {
  color: var(--vp-c-text-2);
  font-size: 13px;
  cursor: pointer;
  user-select: none;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.dialog-btn {
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

  &.dialog-btn-secondary {
    color: var(--vp-button-alt-text);
    background-color: var(--vp-button-alt-bg);
    border: 1px solid var(--vp-c-divider);

    &:hover {
      color: var(--vp-button-alt-hover-text);
      background-color: var(--vp-button-alt-hover-bg);
    }
  }

  &.dialog-btn-primary {
    color: var(--vp-button-brand-text);
    background-color: var(--vp-button-brand-bg);
    border: 1px solid var(--vp-button-brand-border);

    &:hover {
      color: var(--vp-button-brand-hover-text);
      background-color: var(--vp-button-brand-hover-bg);
      border-color: var(--vp-button-brand-hover-border);
    }
  }
}

.dialog-btn:focus-visible,
.dialog-link:focus-visible,
.dialog-checkbox:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.dialog-backdrop[data-state='open'],
.dialog-content[data-state='open'] {
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
