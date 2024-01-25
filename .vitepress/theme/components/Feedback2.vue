<script setup lang="ts">
import { ref } from 'vue'
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogDescription
} from '@headlessui/vue'

const isOpen = ref(true)

const feedbackOptions = [
  {
    label: '💡 Suggestion',
    value: 'suggestion'
  },
  {
    label: '❤️ Appreciation',
    value: 'appreciate'
  },
  { label: '🐞 Bug', value: 'bug' },
  { label: '📂 Other', value: 'other' }
]

function closeModal() {
  isOpen.value = false
}
function openModal() {
  isOpen.value = true
}
</script>

<template>
  <button
    type="button"
    class="p-[4px 8px] text-xl i-carbon:user-favorite-alt-filled"
    @click="openModal"
  />

  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" class="relative z-10" @close="closeModal">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/25" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div
          class="flex min-h-full items-center justify-center p-4 text-center"
        >
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel
              class="w-full max-w-md transform overflow-hidden rounded-2xl bg-bg p-6 text-left align-middle shadow-xl transition-all"
            >
              <DialogTitle
                as="h3"
                class="text-lg font-medium leading-6 text-text"
              >
                Feedback
              </DialogTitle>

              <div class="mt-2">
                <div class="grid gap-[0.5rem]">
                  <button
                    v-for="item in feedbackOptions"
                    :key="item.value"
                    class="inline-flex justify-center rounded-md border border-transparent bg-bg-alt px-4 py-2 text-sm font-medium text-text hover:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <span>{{ item.label }}</span>
                  </button>
                </div>
              </div>

              <div class="mt-2">
                <div>
                  <label class="field-label">Feedback*</label>

                  <textarea placeholder="meow" rows="5" />
                </div>
              </div>

              <div class="mt-4">
                <button
                  type="button"
                  class="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  @click="closeModal"
                >
                  Close
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<style scoped>
textarea,
input {
  font-family: var(--vp-font-family-base);
  background: var(--vp-c-bg-soft);
  font-size: 14px;
  border-radius: 4px;
  padding: 16px;
  width: 100%;

  &::placeholder {
    color: var(--vp-c-text-2) !important;
    opacity: 1;
  }
}

.btn {
  border: 1px solid var(--vp-c-divider);
  background-color: var(--vp-c-bg);
  border-radius: 8px;
  transition:
    border-color 0.25s,
    background-color 0.25s;
  display: inline-block;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  margin: 0;
  padding: 0.375rem 0.75rem;
  text-align: center;
  vertical-align: middle;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.5;
}

.btn:hover {
  border-color: var(--vp-c-brand);
}
</style>
