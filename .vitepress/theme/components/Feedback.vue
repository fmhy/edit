<script setup lang="ts">
import { ref, reactive } from 'vue'
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogDescription,
  Listbox,
  ListboxLabel,
  ListboxButton,
  ListboxOptions,
  ListboxOption
} from '@headlessui/vue'
import { useRouter } from 'vitepress'
import {
  type FeedbackType,
  getFeedbackOption,
  feedbackOptions
} from '../../types/Feedback'

const loading = ref<boolean>(false)
const error = ref<unknown>(null)
const success = ref<boolean>(false)

const router = useRouter()
const feedback = reactive<FeedbackType>({ message: '' })

const options = [
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
const selectedOption = ref(options[0])

async function handleSubmit() {
  loading.value = true

  const body: FeedbackType = {
    message: feedback.message,
    type: selectedOption.value.value,
    page: router.route.path
  }

  try {
    const response = await fetch('https://feedback.tasky.workers.dev', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    const data = await response.json()

    if (data.error) {
      error.value = data.error
      return
    }
    if (data.status === 'ok') {
      success.value = true
    }
  } catch (error) {
    error.value = error
  } finally {
    loading.value = false
  }
}

const isOpen = ref(false)

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

  <Teleport to="body">
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

                <div class="mt-4 top-16 w-72" v-if="!success">
                  <Listbox v-model="selectedOption">
                    <div class="relative mt-1">
                      <ListboxButton
                        class="relative w-full cursor-default rounded-lg bg-bg-alt text-text py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm"
                      >
                        <span class="block truncate">
                          {{ selectedOption.label }}
                        </span>
                        <span
                          class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"
                        >
                          <div
                            class="i-heroicons-solid:chevron-up-down h-5 w-5 text-gray-400"
                            aria-hidden="true"
                          />
                        </span>
                      </ListboxButton>

                      <transition
                        leave-active-class="transition duration-100 ease-in"
                        leave-from-class="opacity-100"
                        leave-to-class="opacity-0"
                      >
                        <ListboxOptions
                          class="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-bg-alt py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm"
                        >
                          <ListboxOption
                            v-slot="{ active, selected }"
                            v-for="option in options"
                            :key="option.value"
                            :value="option"
                            as="template"
                          >
                            <li
                              :class="[
                                active ? 'text-primary' : 'text-gray-500',
                                'relative cursor-default select-none py-2 pl-10 pr-4'
                              ]"
                            >
                              <span
                                :class="[
                                  selected ? 'font-medium' : 'font-normal',
                                  'block truncate'
                                ]"
                              >
                                {{ option.label }}
                              </span>
                              <span
                                v-if="selected"
                                class="absolute inset-y-0 left-0 flex items-center pl-3 text-primary"
                              >
                                <div
                                  class="i-heroicons-solid:check h-5 w-5"
                                  aria-hidden="true"
                                />
                              </span>
                            </li>
                          </ListboxOption>
                        </ListboxOptions>
                      </transition>
                    </div>
                  </Listbox>

                  <div class="mt-2">
                    <div>
                      <label class="field-label">Message</label>
                      <textarea
                        v-model="feedback.message"
                        class="mt-2 h-32"
                        placeholder="What a lovely wiki!"
                        rows="5"
                      />
                    </div>
                  </div>
                  <p class="text-sm text-gray-400 mb-2">
                    If you want a reply to your feedback, feel free to mention a
                    contact in the message or join our
                    <a
                      class="text-primary font-semibold text-underline"
                      href="https://discord.gg/Stz6y6NgNg"
                    >
                      Discord.
                    </a>
                  </p>

                  <details
                    v-if="selectedOption.value === 'suggestion'"
                    class="text-sm text-gray-400"
                  >
                    <summary class="mb-2">Submission Guidelines</summary>
                    <strong>🕹️ Emulators</strong>
                    <p>
                      They're already on the
                      <a
                        class="text-primary font-bold text-underline"
                        href="https://emulation.gametechwiki.com/index.php/Main_Page"
                      >
                        Game Tech Wiki.
                      </a>
                    </p>
                    <strong>🔻 Leeches</strong>
                    <p>
                      They're already on the
                      <a
                        class="text-primary font-bold text-underline"
                        href="https://filehostlist.miraheze.org/wiki/Free_Premium_Leeches"
                      >
                        File Hosting Wiki.
                      </a>
                    </p>
                    <strong>🐧 Distros</strong>
                    <p>
                      They're already on
                      <a
                        class="text-primary font-bold text-underline"
                        href="https://distrowatch.com/"
                      >
                        DistroWatch.
                      </a>
                    </p>
                    <strong>🎲 Mining / Betting Sites</strong>
                    <p>
                      Don't post anything related to betting, mining, BINs, CCs,
                      etc.
                    </p>
                    <strong>🎮 Multiplayer Game Hacks</strong>
                    <p>
                      Don't post any hacks/exploits that give unfair advantages
                      in multiplayer games.
                    </p>
                  </details>

                  <div class="mt-4">
                    <button
                      type="button"
                      class="inline-flex justify-center rounded-md border border-transparent bg-blue-500 px-4 py-2 text-sm font-medium text-blue-100 hover:bg-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:bg-blue-400"
                      :disabled="
                        feedback.message.length < 5 ||
                        feedback.message.length > 1000
                      "
                      @click="handleSubmit()"
                    >
                      Submit
                    </button>

                    <button
                      type="button"
                      class="ml-2 inline-flex justify-center rounded-md border border-transparent bg-red-500 px-4 py-2 text-sm font-medium text-red-100 hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                      @click="closeModal()"
                    >
                      Close
                    </button>
                  </div>
                </div>
                <div v-else-if="error">
                  <div class="text-sm font-medium leading-6 text-text">
                    Error!
                  </div>
                  <details>{{ error }}</details>
                </div>
                <div v-else>
                  <TransitionRoot
                    enter="transition-opacity duration-75"
                    enter-from="opacity-0"
                    enter-to="opacity-100"
                  >
                    Thanks!
                  </TransitionRoot>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
  </Teleport>
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
</style>
