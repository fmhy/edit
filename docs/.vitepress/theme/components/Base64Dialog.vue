<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  show: boolean
  url: string
}>()

const emit = defineEmits(['close'])
const dontShowAgain = ref(false)

const close = () => {
  emit('close')
}

const openLink = () => {
  if (dontShowAgain.value) {
    localStorage.setItem('fmhy-base64-dialog-preference', 'true')
  }
  window.open(props.url, '_blank')
  close()
}
</script>

<template>
  <Teleport to="body">
    <div v-show="show" class="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" @click="close">
      <div 
        class="p-6 rounded-xl shadow-2xl max-w-md w-full"
        style="background-color: var(--vp-c-bg); border: 1px solid var(--vp-c-divider);"
        @click.stop
      >
        <h2 class="text-xl font-bold mb-4 flex items-center gap-2 text-white">
          <div class="i-carbon:information-filled text-primary" />
          Base64 Encoded Link
        </h2>
        <p class="mb-4 text-white">
          The link you clicked leads to a Base64 encoded string.
        </p>
        <p class="mb-2 text-white">
          To decode it, you can use:
        </p>
        <ul class="list-disc list-inside mb-6 space-y-2 text-white">
          <li>
            Online tools like <a href="https://www.base64decode.org/" target="_blank" rel="noreferrer" class="text-primary hover:underline font-medium">base64decode.org</a>
          </li>
          <li>
            Userscript: <a href="https://greasyfork.org/en/scripts/485772-fmhy-base64-auto-decoder" target="_blank" rel="noreferrer" class="text-primary hover:underline font-medium">FMHY Base64 Auto Decoder</a>
          </li>
        </ul>
        
        <div class="flex items-center gap-2 mb-4">
          <input 
            type="checkbox" 
            id="dont-show" 
            v-model="dontShowAgain"
            class="rounded border-border bg-bg-input text-brand focus:ring-brand"
          >
          <label for="dont-show" class="text-sm text-white select-none">Don't show again</label>
        </div>

        <div class="flex justify-end gap-3">
          <button
            @click="close"
            class="px-4 py-2 border border-border rounded-lg hover:bg-bg-input transition-colors font-medium text-text-2"
          >
            Cancel
          </button>
          <button
            @click="openLink"
            class="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors font-medium"
          >
            Open Link
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
