<script setup lang="ts">
  
import { ref, computed, watch } from 'vue'
import { useStorage } from '@vueuse/core'
import tinycolor from 'tinycolor2'

/* ================= PROPS / EMITS ================= */
interface Props {
  modelValue: boolean
}
interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'apply', colors: { link: string; text: string; background: string }): void
}
const props = defineProps<Props>()
const emit = defineEmits<Emits>()



/* ================= RGB STATE ================= */
const linkR = ref(255)
const linkG = ref(255)
const linkB = ref(255)

const textR = ref(255)
const textG = ref(255)
const textB = ref(255)

const bgR = ref(0)
const bgG = ref(0)
const bgB = ref(0)

// Active tab for compact view
const activeTab = ref<'link' | 'text' | 'bg'>('link')

/* ================= COLOR HELPERS ================= */
const rgbToHex = (r:number,g:number,b:number) =>
  tinycolor({ r, g, b }).toHexString()

const hexToRgb = (hex:string) => {
  const c = tinycolor(hex)
  if (!c.isValid()) return null
  const { r, g, b } = c.toRgb()
  return { r, g, b }
}

/* ================= PICKER HANDLERS ================= */
// (Removed complex 2D picker handlers)

/* ================= HEX COMPUTED ================= */
const makeHex = (r:any,g:any,b:any) => computed({
  get: () => rgbToHex(r.value, g.value, b.value),
  set: (val:string) => {
    const rgb = hexToRgb(val)
    if (!rgb) return
    r.value = rgb.r
    g.value = rgb.g
    b.value = rgb.b
  }
})

const linkHex = makeHex(linkR, linkG, linkB)
const textHex = makeHex(textR, textG, textB)
const bgHex   = makeHex(bgR, bgG, bgB)

/* ================= PREVIEW ================= */
const linkColor = computed(() => rgbToHex(linkR.value, linkG.value, linkB.value))
const textColor = computed(() => rgbToHex(textR.value, textG.value, textB.value))
const bgColor   = computed(() => rgbToHex(bgR.value, bgG.value, bgB.value))

/* ================= STORAGE ================= */
const savedLink = useStorage('custom-theme-link-color', '#ffffff')
const savedText = useStorage('custom-theme-text-color', '#cccccc')
const savedBg   = useStorage('custom-theme-bg-color', '#000000')

const initColors = () => {
  const a = hexToRgb(savedLink.value)
  const b = hexToRgb(savedText.value)
  const c = hexToRgb(savedBg.value)
  if (a) { linkR.value = a.r; linkG.value = a.g; linkB.value = a.b }
  if (b) { textR.value = b.r; textG.value = b.g; textB.value = b.b }
  if (c) { bgR.value = c.r; bgG.value = c.g; bgB.value = c.b }
}

watch(() => props.modelValue, v => v && initColors())

/* ================= ACTIONS ================= */
const close = () => emit('update:modelValue', false)

const apply = () => {
  // Save to persistence
  savedLink.value = linkColor.value
  savedText.value = textColor.value
  savedBg.value = bgColor.value

  emit('apply', {
    link: linkColor.value,
    text: textColor.value,
    background: bgColor.value
  })
  close()
}


</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-999 flex items-center justify-center bg-black/50 backdrop-blur-sm"

      >
        <div
          class="bg-$vp-c-bg border-$vp-c-default-soft relative w-full max-w-xl rounded-lg border-2 p-6 shadow-xl select-none"
          @click.stop
        >
          <!-- Header -->
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-$vp-c-text-1 text-lg font-bold">Custom Theme</h3>
            <button
              class="text-$vp-c-text-2 hover:text-$vp-c-text-1 transition-colors"
              @click="close"
              aria-label="Close"
            >
              <div class="i-carbon-close h-5 w-5" />
            </button>
          </div>

          <!-- Preview Section (Compact) -->
          <div class="mb-4 select-none">
            <div
              class="rounded-lg border-2 border-$vp-c-divider p-3 text-sm transition-all duration-300 select-none"
              :style="{ backgroundColor: bgColor, color: textColor }"
            >
              <div class="space-y-1">
                <div>
                  <strong :style="{ color: linkColor }">⭐ AnimeKai</strong>
                  <span :style="{ color: textColor }">, </span>
                  <a href="#" :style="{ color: linkColor }" class="hover:underline">2</a>
                  <span :style="{ color: textColor }">, </span>
                  <a href="#" :style="{ color: linkColor }" class="hover:underline">3</a>
                  <span :style="{ color: textColor }">, </span>
                  <a href="#" :style="{ color: linkColor }" class="hover:underline">4</a>
                  <span :style="{ color: textColor }">, </span>
                  <a href="#" :style="{ color: linkColor }" class="hover:underline">5</a>
                  <span :style="{ color: textColor }">, </span>
                  <a href="#" :style="{ color: linkColor }" class="hover:underline">6</a>
                  <span :style="{ color: textColor }">, </span>
                  <a href="#" :style="{ color: linkColor }" class="hover:underline">7</a>
                  <span :style="{ color: textColor }"> or </span>
                  <strong :style="{ color: linkColor }">AniGo</strong>
                  <span :style="{ color: textColor }"> - Hard Subs / Dub / Auto-Next</span>
                </div>
                <div>
                  <strong :style="{ color: linkColor }">⭐ Miruro</strong>
                  <span :style="{ color: textColor }"> - Hard Subs / Dub / Auto-Next</span>
                </div>
                <div>
                  <strong :style="{ color: linkColor }">⭐ HiAnime</strong>
                  <span :style="{ color: textColor }">, </span>
                  <a href="#" :style="{ color: linkColor }" class="hover:underline">2</a>
                  <span :style="{ color: textColor }">, </span>
                  <a href="#" :style="{ color: linkColor }" class="hover:underline">3</a>
                  <span :style="{ color: textColor }">, </span>
                  <a href="#" :style="{ color: linkColor }" class="hover:underline">4</a>
                  <span :style="{ color: textColor }">, </span>
                  <a href="#" :style="{ color: linkColor }" class="hover:underline">5</a>
                  <span :style="{ color: textColor }"> - Sub / Dub / Auto-Next</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Tabs -->
          <div class="mb-4 flex gap-2">
            <button
              @click="activeTab = 'link'"
              :class="[
                'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                activeTab === 'link' 
                  ? 'bg-$vp-c-brand-1 text-white' 
                  : 'bg-$vp-c-bg-alt text-$vp-c-text-2 hover:text-$vp-c-text-1'
              ]"
            >
              Link
            </button>
            <button
              @click="activeTab = 'bg'"
              :class="[
                'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                activeTab === 'bg' 
                  ? 'bg-$vp-c-brand-1 text-white' 
                  : 'bg-$vp-c-bg-alt text-$vp-c-text-2 hover:text-$vp-c-text-1'
              ]"
            >
              Background
            </button>
            <button
              @click="activeTab = 'text'"
              :class="[
                'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                activeTab === 'text' 
                  ? 'bg-$vp-c-brand-1 text-white' 
                  : 'bg-$vp-c-bg-alt text-$vp-c-text-2 hover:text-$vp-c-text-1'
              ]"
            >
              Text
            </button>
          </div>

          <!-- RGB Sliders Section -->
          <div class="mb-4">
            <!-- Link sliders -->
            <div v-show="activeTab === 'link'" class="space-y-4">
              <div class="space-y-1">
                <div class="flex justify-between text-xs text-$vp-c-text-2">
                  <span>Red</span>
                  <span>{{ linkR }}</span>
                </div>
                <input type="range" min="0" max="255" v-model.number="linkR" class="custom-slider w-full" style="--slider-color: #ff4d4d" />
              </div>
              <div class="space-y-1">
                <div class="flex justify-between text-xs text-$vp-c-text-2">
                  <span>Green</span>
                  <span>{{ linkG }}</span>
                </div>
                <input type="range" min="0" max="255" v-model.number="linkG" class="custom-slider w-full" style="--slider-color: #4dff4d" />
              </div>
              <div class="space-y-1">
                <div class="flex justify-between text-xs text-$vp-c-text-2">
                  <span>Blue</span>
                  <span>{{ linkB }}</span>
                </div>
                <input type="range" min="0" max="255" v-model.number="linkB" class="custom-slider w-full" style="--slider-color: #4d4dff" />
              </div>
            </div>

            <!-- Background sliders -->
            <div v-show="activeTab === 'bg'" class="space-y-4">
              <div class="space-y-1">
                <div class="flex justify-between text-xs text-$vp-c-text-2">
                  <span>Red</span>
                  <span>{{ bgR }}</span>
                </div>
                <input type="range" min="0" max="255" v-model.number="bgR" class="custom-slider w-full" style="--slider-color: #ff4d4d" />
              </div>
              <div class="space-y-1">
                <div class="flex justify-between text-xs text-$vp-c-text-2">
                  <span>Green</span>
                  <span>{{ bgG }}</span>
                </div>
                <input type="range" min="0" max="255" v-model.number="bgG" class="custom-slider w-full" style="--slider-color: #4dff4d" />
              </div>
              <div class="space-y-1">
                <div class="flex justify-between text-xs text-$vp-c-text-2">
                  <span>Blue</span>
                  <span>{{ bgB }}</span>
                </div>
                <input type="range" min="0" max="255" v-model.number="bgB" class="custom-slider w-full" style="--slider-color: #4d4dff" />
              </div>
            </div>

            <!-- Text sliders -->
            <div v-show="activeTab === 'text'" class="space-y-4">
              <div class="space-y-1">
                <div class="flex justify-between text-xs text-$vp-c-text-2">
                  <span>Red</span>
                  <span>{{ textR }}</span>
                </div>
                <input type="range" min="0" max="255" v-model.number="textR" class="custom-slider w-full" style="--slider-color: #ff4d4d" />
              </div>
              <div class="space-y-1">
                <div class="flex justify-between text-xs text-$vp-c-text-2">
                  <span>Green</span>
                  <span>{{ textG }}</span>
                </div>
                <input type="range" min="0" max="255" v-model.number="textG" class="custom-slider w-full" style="--slider-color: #4dff4d" />
              </div>
              <div class="space-y-1">
                <div class="flex justify-between text-xs text-$vp-c-text-2">
                  <span>Blue</span>
                  <span>{{ textB }}</span>
                </div>
                <input type="range" min="0" max="255" v-model.number="textB" class="custom-slider w-full" style="--slider-color: #4d4dff" />
              </div>
            </div>
          </div>

          <!-- Input Fields (shown for active tab) -->
          <div class="mb-6">
            <!-- Link Inputs -->
            <div v-show="activeTab === 'link'" class="grid grid-cols-5 gap-2">
              <div class="col-span-2">
                <label class="text-$vp-c-text-2 text-xs block mb-1">HEX</label>
                <input
                  v-model="linkHex"
                  type="text"
                  class="bg-$vp-c-bg-alt border-$vp-c-divider text-$vp-c-text-1 w-full rounded border px-2 py-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label class="text-$vp-c-text-2 text-xs block mb-1">R</label>
                <input v-model.number="linkR" type="number" min="0" max="255"
                  class="bg-$vp-c-bg-alt border-$vp-c-divider text-$vp-c-text-1 w-full rounded border px-2 py-1.5 text-xs" />
              </div>
              <div>
                <label class="text-$vp-c-text-2 text-xs block mb-1">G</label>
                <input v-model.number="linkG" type="number" min="0" max="255"
                  class="bg-$vp-c-bg-alt border-$vp-c-divider text-$vp-c-text-1 w-full rounded border px-2 py-1.5 text-xs" />
              </div>
              <div>
                <label class="text-$vp-c-text-2 text-xs block mb-1">B</label>
                <input v-model.number="linkB" type="number" min="0" max="255"
                  class="bg-$vp-c-bg-alt border-$vp-c-divider text-$vp-c-text-1 w-full rounded border px-2 py-1.5 text-xs" />
              </div>
            </div>

            <!-- Background Inputs -->
            <div v-show="activeTab === 'bg'" class="grid grid-cols-5 gap-2">
              <div class="col-span-2">
                <label class="text-$vp-c-text-2 text-xs block mb-1">HEX</label>
                <input
                  v-model="bgHex"
                  type="text"
                  class="bg-$vp-c-bg-alt border-$vp-c-divider text-$vp-c-text-1 w-full rounded border px-2 py-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label class="text-$vp-c-text-2 text-xs block mb-1">R</label>
                <input v-model.number="bgR" type="number" min="0" max="255"
                  class="bg-$vp-c-bg-alt border-$vp-c-divider text-$vp-c-text-1 w-full rounded border px-2 py-1.5 text-xs" />
              </div>
              <div>
                <label class="text-$vp-c-text-2 text-xs block mb-1">G</label>
                <input v-model.number="bgG" type="number" min="0" max="255"
                  class="bg-$vp-c-bg-alt border-$vp-c-divider text-$vp-c-text-1 w-full rounded border px-2 py-1.5 text-xs" />
              </div>
              <div>
                <label class="text-$vp-c-text-2 text-xs block mb-1">B</label>
                <input v-model.number="bgB" type="number" min="0" max="255"
                  class="bg-$vp-c-bg-alt border-$vp-c-divider text-$vp-c-text-1 w-full rounded border px-2 py-1.5 text-xs" />
              </div>
            </div>

            <!-- Text Inputs -->
            <div v-show="activeTab === 'text'" class="grid grid-cols-5 gap-2">
              <div class="col-span-2">
                <label class="text-$vp-c-text-2 text-xs block mb-1">HEX</label>
                <input
                  v-model="textHex"
                  type="text"
                  class="bg-$vp-c-bg-alt border-$vp-c-divider text-$vp-c-text-1 w-full rounded border px-2 py-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label class="text-$vp-c-text-2 text-xs block mb-1">R</label>
                <input v-model.number="textR" type="number" min="0" max="255"
                  class="bg-$vp-c-bg-alt border-$vp-c-divider text-$vp-c-text-1 w-full rounded border px-2 py-1.5 text-xs" />
              </div>
              <div>
                <label class="text-$vp-c-text-2 text-xs block mb-1">G</label>
                <input v-model.number="textG" type="number" min="0" max="255"
                  class="bg-$vp-c-bg-alt border-$vp-c-divider text-$vp-c-text-1 w-full rounded border px-2 py-1.5 text-xs" />
              </div>
              <div>
                <label class="text-$vp-c-text-2 text-xs block mb-1">B</label>
                <input v-model.number="textB" type="number" min="0" max="255"
                  class="bg-$vp-c-bg-alt border-$vp-c-divider text-$vp-c-text-1 w-full rounded border px-2 py-1.5 text-xs" />
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-3">
            <button
              class="hover:bg-$vp-c-bg-alt border-$vp-c-divider text-$vp-c-text-1 flex-1 rounded-lg border px-4 py-2 font-medium transition-colors"
              @click="close"
            >
              Cancel
            </button>
            <button
              class="bg-$vp-c-brand-1 hover:bg-$vp-c-brand-2 flex-1 rounded-lg px-4 py-2 font-medium text-white transition-colors"
              @click="apply"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .bg-\$vp-c-bg,
.modal-leave-active .bg-\$vp-c-bg {
  transition: transform 0.3s ease;
}

.modal-enter-from .bg-\$vp-c-bg,
.modal-leave-to .bg-\$vp-c-bg {
  transform: scale(0.9);
}

/* Custom slider styling */
.custom-slider {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(
    to right,
    transparent 0%,
    var(--slider-color, var(--vp-c-brand-1)) 100%
  );
  outline: none;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.custom-slider:hover {
  opacity: 1;
}

.custom-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.custom-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
</style>
