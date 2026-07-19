<script setup lang="ts">
import type { FeedbackType } from '../../types/Feedback'
import { useRouter } from 'vitepress'
import { computed, onUnmounted, reactive, ref } from 'vue'
import { feedbackOptions, getFeedbackOption } from '../../types/Feedback'
import {
  getRateLimitCooldown,
  recordSubmission
} from '../composables/rateLimit'
import { sanitizeRichHtml } from '../composables/sanitize'

const props = defineProps<{
  heading?: string
}>()

const prompts = [
  'Make it count!',
  'Leave some feedback for us!',
  `We're all ears 🐰`,
  'Tell us what is missing in FMHY',
  'Your thoughts matter to us 💡',
  'Feedback is a gift 🎁',
  'What do you think?',
  'We appreciate your support 🙏',
  'Help us make FMHY better 🤝',
  'We need your help 👋',
  'Your feedback is valuable 💯',
  'So... what do you think?',
  "I guess you don't need to say anything 😉",
  'Spill the beans 💣',
  "We're always looking for ways to improve!",
  'Your feedback is valuable and helps us make FMHY better.',
  'aliens are watching you 👽',
  'tasky was here 👀',
  'The internet is full of crap 😱'
]

function getPrompt() {
  return prompts[Math.floor(Math.random() * prompts.length)]
}

const messages = {
  suggestion: [
    "We're glad you want to share your ideas!",
    'Nix the fluff and just tell us what you think!',
    "We'll be happy to read your thoughts and incorporate them into our wiki.",
    "Hello! We're glad you want to share your ideas!"
  ],
  appreciation: [
    'We appreciate your support!',
    "We're always looking for ways to improve!.",
    'Your feedback is valuable and helps us make FMHY better.'
  ],
  other: [
    "We're always looking for ways to improve!",
    'Your feedback is valuable and helps us make FMHY better.'
  ]
}

function getMessage(type: FeedbackType['type']) {
  return messages[type][Math.floor(Math.random() * messages[type].length)]
}

const loading = ref<boolean>(false)
const error = ref<unknown>(null)
const success = ref<boolean>(false)

const isSelectingLine = ref<boolean>(false)
const highlightStyle = reactive({
  display: 'none',
  top: '0px',
  left: '0px',
  width: '0px',
  height: '0px'
})
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const BLOCK_SELECTOR = 'p, li, td, th, h1, h2, h3, h4, h5, h6'
const NON_CONTENT_SELECTOR =
  '.feedback-widget, button, a, input, textarea, select'

const isSelectableTarget = (target: HTMLElement) =>
  !!target.closest('.vp-doc') && !target.closest(NON_CONTENT_SELECTOR)

const extractBlockContent = (blockElement: HTMLElement) => {
  const clone = blockElement.cloneNode(true) as HTMLElement
  clone.querySelectorAll('.feedback-widget').forEach((el) => el.remove())
  return { text: clone.textContent?.trim() ?? '', html: clone.innerHTML }
}

const startSelectingLine = () => {
  isSelectingLine.value = true
  document.body.style.cursor = 'crosshair'
  document.body.classList.add('feedback-selecting')
  window.addEventListener('mouseover', handleMouseOver)
  window.addEventListener('click', handlePageClick, { capture: true })
}

const stopSelectingLine = () => {
  isSelectingLine.value = false
  document.body.style.cursor = 'default'
  document.body.classList.remove('feedback-selecting')
  highlightStyle.display = 'none'
  window.removeEventListener('mouseover', handleMouseOver)
  window.removeEventListener('click', handlePageClick, { capture: true })
}

const handleMouseOver = (event: MouseEvent) => {
  if (!isSelectingLine.value) return
  const target = event.target as HTMLElement
  if (!isSelectableTarget(target)) {
    highlightStyle.display = 'none'
    return
  }
  const blockElement = target.closest(BLOCK_SELECTOR) as HTMLElement | null
  if (blockElement) {
    const rect = blockElement.getBoundingClientRect()
    highlightStyle.display = 'block'
    highlightStyle.top = `${rect.top + window.scrollY - 2}px`
    highlightStyle.left = `${rect.left + window.scrollX - 4}px`
    highlightStyle.width = `${rect.width + 8}px`
    highlightStyle.height = `${rect.height + 4}px`
  } else {
    highlightStyle.display = 'none'
  }
}

const handlePageClick = (event: MouseEvent) => {
  if (!isSelectingLine.value) return
  const target = event.target as HTMLElement
  if (!isSelectableTarget(target)) {
    stopSelectingLine()
    return
  }
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()

  const blockElement = target.closest(BLOCK_SELECTOR) as HTMLElement | null
  if (blockElement) {
    const { text, html } = extractBlockContent(blockElement)
    if (text) {
      feedback.selectedLine = text
      feedback.selectedLineHtml = html
    }
  }
  stopSelectingLine()
}

onUnmounted(() => {
  stopSelectingLine()
})

const clearSelectedLine = () => {
  feedback.selectedLine = undefined
  feedback.selectedLineHtml = undefined
}

const handleInput = (event: Event) => {
  error.value = null
  const target = event.target as HTMLTextAreaElement
  target.style.height = 'auto'
  target.style.height = `${target.scrollHeight}px`
}

const isDisabled = computed(() => {
  const combinedMessage = feedback.selectedLine
    ? `> ${feedback.selectedLine}\n\n${feedback.message}`
    : feedback.message

  return (
    !combinedMessage.length ||
    combinedMessage.length < 5 ||
    combinedMessage.length > 1000
  )
})

const router = useRouter()

const feedback = reactive<{
  message: string
  page: string
  contact?: string
  type?: FeedbackType['type']
  selectedLine?: string
  selectedLineHtml?: string
}>({
  page: router.route.path,
  message: '',
  contact: '',
  selectedLine: undefined,
  selectedLineHtml: undefined
})

const selectedOption = ref(feedbackOptions[0])

function selectType(type: FeedbackType['type']) {
  feedback.type = type
  selectedOption.value = getFeedbackOption(type)!
}

async function handleSubmit() {
  const cooldown = getRateLimitCooldown()
  if (cooldown > 0) {
    error.value = `Too Many Requests. Try again in ${cooldown}s.`
    return
  }

  loading.value = true
  error.value = null

  const finalMessage = feedback.selectedLine
    ? `> ${feedback.selectedLine}\n\n${feedback.message}`
    : feedback.message

  const body: FeedbackType = {
    message: finalMessage,
    type: feedback.type!,
    page: feedback.page,
    ...(props.heading && { heading: props.heading }),
    ...(feedback.contact && { contact: feedback.contact })
  }

  recordSubmission()

  try {
    const response = await fetch('https://api.fmhy.net/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    const data = await response.json()
    if (!response.ok || data.error) {
      error.value = data.message || data.error || 'Failed to send feedback'
      return
    }
    if (data.status === 'ok') {
      success.value = true
    }
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : 'An unexpected error occurred'
  } finally {
    loading.value = false
  }
}

const isCardShown = ref<boolean>(false)
const helpfulText = props.heading
  ? 'What do you think about this section?'
  : 'What do you think about this page?'
const helpfulDescription = props.heading
  ? 'Let us know how helpful this section is.'
  : 'Let us know how helpful this page is.'

const prompt = computed(() => getPrompt())
const message = computed(() => getMessage(feedback.type!))
const toggleCard = () => {
  isCardShown.value = !isCardShown.value
  if (!isCardShown.value) stopSelectingLine()
}
const goBackToOptions = () => {
  feedback.type = undefined
  error.value = null
  stopSelectingLine()
}

const resetFeedback = () => {
  goBackToOptions()
  success.value = false
  feedback.message = ''
  feedback.selectedLine = undefined
  feedback.selectedLineHtml = undefined
  if (textareaRef.value) {
    textareaRef.value.style.height = '100px'
  }
}
</script>

<template>
  <template v-if="props.heading">
    <button
      class="feedback-widget bg-$vp-c-default-soft text-primary border-$vp-c-default-soft hover:border-primary ml-3 inline-flex h-7 items-center justify-center whitespace-nowrap rounded-md border-2 border-solid px-1.5 py-3.5 text-sm font-medium transition-all duration-300 sm:h-6"
      @click="toggleCard()"
    >
      <span
        :class="isCardShown === false ? `i-lucide:mail` : `i-lucide:mail-x`"
      />
    </button>
  </template>
  <template v-else>
    <div
      class="feedback-widget mt-2 p-4 border-2 border-solid bg-$vp-c-bg-alt border-$vp-c-divider rounded-xl col-span-3 transition-colors duration-250"
    >
      <div class="flex items-start md:items-center gap-3">
        <div class="pt-1 md:pt-0">
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center bg-$vp-c-brand-3"
          >
            <span
              :class="
                isCardShown === false
                  ? `i-lucide:mail w-6 h-6 text-white`
                  : `i-lucide:mail-x w-6 h-6 text-white`
              "
            />
          </div>
        </div>
        <div
          class="flex-grow flex items-start md:items-center gap-3 flex-col md:flex-row"
        >
          <div class="flex-grow">
            <div class="font-semibold text-$vp-c-text-1">Got feedback?</div>
            <div class="text-sm text-$vp-c-text-2">
              We'd love to know what you think about this page.
            </div>
          </div>
          <div>
            <button
              class="bg-[#25262B] inline-block text-center rounded-full px-4 py-2.5 text-sm font-medium border-2 border-solid text-white border-$vp-c-divider"
              @click="toggleCard()"
            >
              Share Feedback
            </button>
          </div>
        </div>
      </div>
    </div>
  </template>

  <Transition name="fade" mode="out-in">
    <div
      v-if="isCardShown"
      class="feedback-widget feedback-card border-$vp-c-divider bg-$vp-c-bg-alt b-rd-4 m-[2rem 0] mt-4 border-2 border-solid p-6"
    >
      <Transition name="fade" mode="out-in">
        <div v-if="!feedback.type">
          <p class="heading">
            {{ helpfulText }}
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="item in feedbackOptions"
              :key="item.value"
              class="bg-[#25262B] border-$vp-c-default-soft hover:border-primary mt-2 select-none rounded border-2 border-solid font-bold transition-all duration-250 rounded-lg text-[14px] text-white font-500 leading-normal m-0 px-3 py-1.5 text-center align-middle whitespace-nowrap"
              @click="selectType(item.value)"
            >
              <span>{{ item.label }}</span>
            </button>
          </div>
        </div>
        <div v-else-if="feedback.type && !success">
          <div>
            <p class="desc">{{ helpfulDescription }} - {{ prompt }}</p>
            <div class="flex items-center gap-3 mt-1">
              <button
                class="bg-$vp-c-default-soft text-primary border-$vp-c-default-soft hover:border-primary inline-flex h-7 w-7 items-center justify-center rounded-md border-2 border-solid transition-all duration-300"
                title="Back to options"
                @click="goBackToOptions()"
              >
                <span class="i-lucide:arrow-left w-4 h-4"></span>
              </button>
              <span>
                {{ getFeedbackOption(feedback.type || 'suggestion')?.label }}
              </span>
            </div>
          </div>
          <p class="heading" v-text="message"></p>
          <div v-if="feedback.type === 'suggestion'" class="mb-2 text-sm">
            <p>
              Please read the
              <a href="/other/contributing">Contribute Guide</a>
              before submitting your feedback!
            </p>
          </div>
          <div
            v-if="error"
            class="error-msg mb-4 p-3 rounded-lg bg-red-900/20 border border-red-500/50 text-red-300 text-xs"
          >
            <span class="font-bold">Error:</span>
            {{
              typeof error === 'string'
                ? error
                : (error as any).message ||
                  'Failed to send feedback. Please try again.'
            }}
          </div>
          <div
            v-if="feedback.selectedLine"
            class="mb-3 flex items-start gap-2 p-3 bg-$vp-c-bg text-$vp-c-text-2 rounded-lg border border-$vp-c-divider text-sm relative group"
          >
            <div class="i-lucide:quote opacity-50 mt-0.5 min-w-[16px]"></div>
            <div
              class="flex-grow italic line-clamp-3 pointer-events-none vp-doc feedback-quote"
              style="margin: 0"
              v-html="
                sanitizeRichHtml(feedback.selectedLineHtml) ||
                feedback.selectedLine
              "
            ></div>
            <button
              class="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-$vp-c-default-soft rounded text-$vp-c-text-3 hover:text-red-400"
              title="Remove selected line"
              @click="clearSelectedLine"
            >
              <span class="i-lucide:trash-2 w-4 h-4"></span>
            </button>
          </div>
          <textarea
            ref="textareaRef"
            v-model="feedback.message"
            autofocus
            class="bg-$vp-c-bg-alt text-$vp-c-text-2 w-full min-h-[100px] max-h-[400px] border border-$vp-c-divider rounded px-3 py-1.5 border-$vp-c-divider bg-$vp-c-bg-alt b-rd-4 border-2 border-solid resize-none overflow-y-auto"
            placeholder="What a lovely wiki!"
            @input="handleInput"
          />
          <div class="flex items-center gap-2 mt-2 mb-2">
            <button
              type="button"
              class="flex items-center gap-1.5 text-xs font-medium text-$vp-c-text-2 hover:text-primary transition-colors bg-$vp-c-default-soft px-2 py-1 rounded border border-$vp-c-divider hover:border-primary"
              @click="
                isSelectingLine ? stopSelectingLine() : startSelectingLine()
              "
            >
              <span
                :class="
                  isSelectingLine ? 'i-lucide:x' : 'i-lucide:text-cursor-input'
                "
                class="w-3.5 h-3.5"
              ></span>
              {{
                isSelectingLine ? 'Cancel Selection' : 'Select a line from page'
              }}
            </button>
            <span
              v-if="isSelectingLine"
              class="text-xs text-$vp-c-text-3 animate-pulse"
            >
              Click any text on the page...
            </span>
          </div>
          <div class="mt-4 mb-1 text-sm font-semibold text-$vp-c-text-1">
            Contact Info (Optional)
          </div>
          <p class="desc mb-3">
            Add your Discord handle if you would like a response, or if we need
            more information from you, otherwise join our
            <a
              class="text-primary text-underline font-semibold"
              href="https://github.com/fmhy/FMHY/wiki/FMHY-Discord"
            >
              Discord.
            </a>
          </p>
          <input
            v-model="feedback.contact"
            type="text"
            class="bg-$vp-c-bg-alt text-$vp-c-text-2 w-full border border-$vp-c-divider rounded px-3 py-1.5 border-$vp-c-divider bg-$vp-c-bg-alt b-rd-4 border-2 border-solid"
            placeholder="(ex. Discord: username)"
            @input="error = null"
          />
          <div class="flex flex-row gap-2 mt-4">
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="isDisabled || loading"
              :style="
                isDisabled || loading
                  ? {}
                  : {
                      'background-color': 'var(--vp-button-brand-bg)',
                      'border-color': 'var(--vp-button-brand-border)',
                      color: 'var(--vp-button-brand-text)'
                    }
              "
              @click="handleSubmit()"
            >
              {{ loading ? 'Sending...' : 'Send Feedback 📩' }}
            </button>
          </div>
        </div>
        <div v-else class="text-center py-4">
          <p class="heading mb-4">Thanks for your feedback!</p>
          <button class="btn btn-primary" @click="resetFeedback()">
            Send Another Message
          </button>
        </div>
      </Transition>
    </div>
  </Transition>

  <Teleport to="body">
    <div
      v-if="isSelectingLine"
      class="pointer-events-none absolute z-[9999] rounded border-2 border-solid transition-all duration-75"
      :style="{
        ...highlightStyle,
        backgroundColor: 'var(--vp-c-brand)',
        borderColor: 'var(--vp-c-brand)',
        opacity: '0.2'
      }"
    ></div>
  </Teleport>
</template>

<style scoped lang="css">
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

.btn-primary {
  color: var(--vp-button-brand-text);
  background-color: var(--vp-button-brand-bg);
  border-color: var(--vp-button-brand-border);
}

.btn-primary:hover {
  background-color: var(--vp-button-brand-hover-bg);
  border-color: var(--vp-button-brand-hover-border);
}

.heading {
  font-size: 1.2rem;
  font-weight: 700;
}

.desc {
  display: block;
  line-height: 20px;
  font-size: 12px;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.feedback-quote {
  color: var(--vp-c-text-2) !important;
}
.feedback-quote :deep(*) {
  color: inherit !important;
  margin: 0 !important;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<style>
body.feedback-selecting a {
  pointer-events: none !important;
}
</style>
