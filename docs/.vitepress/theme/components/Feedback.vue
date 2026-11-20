<script setup lang="ts">
import type { FeedbackType } from '../../types/Feedback'
import { useRouter } from 'vitepress'
import {
  computed,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  watchEffect
} from 'vue'
import { feedbackOptions, getFeedbackOption } from '../../types/Feedback'
import {
  getRateLimitCooldown,
  recordSubmission
} from '../composables/rateLimit'
import { sanitizeRichHtml } from '../composables/sanitize'

const props = defineProps<{
  heading?: string
}>()

const messages = {
  suggestion: ['Share your ideas', 'Tell us what to add'],
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
      if (isSuggestionPath.value) {
        const current = suggestionSite.value.trim()
        if (!current || siteAutoFilled.value) {
          suggestionSite.value = pageUrl.value
          siteAutoFilled.value = true
        }
      }
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

type SuggestionKind = 'add' | 'remove' | 'dead' | 'other'

const MAX_MESSAGE_LENGTH = 1000
const MIN_MESSAGE_LENGTH = 5
const MIN_SUGGESTION_DESCRIPTION = 10
const SITE_MAX_LENGTH = 200

const suggestionKinds: { value: SuggestionKind; label: string }[] = [
  { value: 'add', label: 'Add a site' },
  { value: 'remove', label: 'Remove a site' },
  { value: 'dead', label: 'Site is dead' },
  { value: 'other', label: 'Something else' }
]

const suggestionKind = ref<SuggestionKind | null>(null)
const suggestionSite = ref('')
// True only while the site field holds a value we filled in from a picked
// line, so a value the contributor typed is never overwritten.
const siteAutoFilled = ref(false)

const isSuggestionPath = computed(() => feedback.type === 'suggestion')

const SITE_ORIGIN = 'https://fmhy.net'

const pageUrl = computed(() => {
  const path = router.route.path || '/'
  const trimmedPath = path !== '/' ? path.replace(/\/+$/, '') : ''
  return `${SITE_ORIGIN}${trimmedPath}`
})

const selectedKindLabel = computed(
  () =>
    suggestionKinds.find((kind) => kind.value === suggestionKind.value)
      ?.label ?? ''
)

const trimmedSite = computed(() => suggestionSite.value.trim())

const quoteBlock = computed(() =>
  feedback.selectedLine ? `> ${feedback.selectedLine}\n\n` : ''
)

const siteError = computed(() => {
  if (!isSuggestionPath.value) return ''
  const site = trimmedSite.value
  if (!site) return ''
  if (site.length > SITE_MAX_LENGTH)
    return 'Keep the link under 200 characters, please.'
  if (!/^https?:\/\//i.test(site))
    return 'Enter a full link starting with http:// or https://'
  return ''
})

const suggestionPrefix = computed(() => {
  if (!isSuggestionPath.value || !selectedKindLabel.value) return ''
  const site = trimmedSite.value ? ` ${trimmedSite.value}` : ''
  return `${quoteBlock.value}[${selectedKindLabel.value}]${site}\n\n`
})

const suggestionDescriptionMax = computed(() =>
  Math.max(0, MAX_MESSAGE_LENGTH - suggestionPrefix.value.length)
)

const suggestionRemaining = computed(() =>
  Math.max(0, suggestionDescriptionMax.value - feedback.message.length)
)

const descriptionTooShort = computed(
  () =>
    isSuggestionPath.value &&
    feedback.message.trim().length < MIN_SUGGESTION_DESCRIPTION
)

function handleSiteInput() {
  siteAutoFilled.value = false
  error.value = null
}

function selectSuggestionKind(kind: SuggestionKind) {
  suggestionKind.value = kind
  error.value = null
}

function buildMessage() {
  if (!isSuggestionPath.value || !selectedKindLabel.value) {
    return `${quoteBlock.value}${feedback.message}`
  }
  return `${suggestionPrefix.value}${feedback.message}`
}

/**
 * The composed message must stay inside the schema limit, so the description
 * budget shrinks when the quote, kind or site changes. Clamp what is already
 * typed rather than letting the composed message grow past 1000 characters.
 */
watchEffect(() => {
  if (!isSuggestionPath.value) return
  const max = suggestionDescriptionMax.value
  if (feedback.message.length > max) {
    feedback.message = feedback.message.slice(0, max)
  }
})

const isDisabled = computed(() => {
  if (isSuggestionPath.value) {
    if (!suggestionKind.value) return true
    if (siteError.value) return true
    return (
      feedback.message.trim().length < MIN_SUGGESTION_DESCRIPTION ||
      buildMessage().length > MAX_MESSAGE_LENGTH
    )
  }

  const combinedMessage = feedback.selectedLine
    ? `> ${feedback.selectedLine}\n\n${feedback.message}`
    : feedback.message

  return (
    !combinedMessage.length ||
    combinedMessage.length < MIN_MESSAGE_LENGTH ||
    combinedMessage.length > MAX_MESSAGE_LENGTH
  )
})

const CONTACT_STORAGE_KEY = 'fmhy-feedback-contact'

/**
 * Restore the contributor's own contact detail from their own browser only.
 * Nothing here is sent anywhere new; a failure is always swallowed so the
 * widget keeps working (private mode, embedded contexts, SSR).
 */
function rememberContact(value: string) {
  try {
    if (typeof localStorage === 'undefined') return
    if (value) {
      localStorage.setItem(CONTACT_STORAGE_KEY, value)
    } else {
      localStorage.removeItem(CONTACT_STORAGE_KEY)
    }
  } catch {
    // Storage is best effort and never blocks feedback.
  }
}

function restoreContact() {
  try {
    if (typeof localStorage === 'undefined') return
    const saved = localStorage.getItem(CONTACT_STORAGE_KEY)
    if (typeof saved === 'string' && saved.trim().length > 0) {
      feedback.contact = saved
    }
  } catch {
    // Storage is best effort and never blocks feedback.
  }
}

onMounted(() => {
  restoreContact()
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

  const finalMessage = buildMessage()

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
      rememberContact(feedback.contact?.trim() ?? '')
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
  // Back to the form, not to the pitch or the category choice: the category
  // the contributor already picked is kept.
  error.value = null
  stopSelectingLine()
  success.value = false
  feedback.message = ''
  feedback.selectedLine = undefined
  feedback.selectedLineHtml = undefined
  suggestionKind.value = null
  suggestionSite.value = ''
  siteAutoFilled.value = false
  if (textareaRef.value) {
    textareaRef.value.style.height = ''
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
    <div v-if="!isCardShown" class="feedback-widget pitch col-span-3">
      <span class="pitch-icon">
        <span class="i-lucide:mail pitch-icon-glyph"></span>
      </span>
      <span class="pitch-text">
        <span class="pitch-title">Got feedback?</span>
        <span class="pitch-sub">
          We'd love to know what you think about this page.
        </span>
      </span>
      <button type="button" class="pitch-pill" @click="toggleCard()">
        Share Feedback
      </button>
    </div>
  </template>

  <Transition name="fade" mode="out-in">
    <div
      v-if="isCardShown"
      class="feedback-widget feedback-card border-$vp-c-divider bg-$vp-c-bg-alt b-rd-4 m-[2rem 0] mt-4 border-2 border-solid"
    >
      <Transition name="fade" mode="out-in">
        <div v-if="!feedback.type">
          <p class="heading">{{ helpfulText }}</p>
          <div class="chips options">
            <button
              v-for="item in feedbackOptions"
              :key="item.value"
              type="button"
              class="option-btn"
              @click="selectType(item.value)"
            >
              {{ item.label }}
            </button>
          </div>
        </div>
        <div v-else-if="feedback.type && !success">
          <div class="feedback-head">
            <button
              type="button"
              class="head-back"
              title="Back to options"
              @click="goBackToOptions()"
            >
              <span class="i-lucide:arrow-left w-4 h-4"></span>
            </button>
            <span class="head-label">
              {{ getFeedbackOption(feedback.type || 'suggestion')?.label }}
            </span>
          </div>
          <p class="heading" v-text="message"></p>
          <p v-if="isSuggestionPath" class="step-sub">
            Add a link if you're suggesting a site
            <a class="step-link" href="/other/contributing">(guide)</a>
          </p>
          <div v-if="error" class="error-msg">
            <span class="error-lead">Error:</span>
            {{
              typeof error === 'string'
                ? error
                : (error as any).message ||
                  'Failed to send feedback. Please try again.'
            }}
          </div>
          <div v-if="feedback.selectedLine" class="quote-block">
            <span class="i-lucide:quote quote-icon"></span>
            <div
              class="quote-text vp-doc feedback-quote line-clamp-3"
              v-html="
                sanitizeRichHtml(feedback.selectedLineHtml) ||
                feedback.selectedLine
              "
            ></div>
            <button
              type="button"
              class="quote-remove"
              title="Remove selected line"
              @click="clearSelectedLine"
            >
              <span class="i-lucide:trash-2 w-4 h-4"></span>
            </button>
          </div>
          <div v-if="isSuggestionPath" class="field">
            <div id="fmhy-suggestion-kind" class="field-label">
              What kind of suggestion is this?
            </div>
            <div
              class="chips"
              role="group"
              aria-labelledby="fmhy-suggestion-kind"
            >
              <button
                v-for="kind in suggestionKinds"
                :key="kind.value"
                type="button"
                class="chip"
                :class="{ 'chip-active': suggestionKind === kind.value }"
                :aria-pressed="suggestionKind === kind.value"
                @click="selectSuggestionKind(kind.value)"
              >
                {{ kind.label }}
              </button>
            </div>
          </div>
          <div v-if="isSuggestionPath" class="field">
            <label class="field-label" for="fmhy-suggestion-site">
              Site or page
              <span class="field-optional">optional</span>
            </label>
            <input
              id="fmhy-suggestion-site"
              v-model="suggestionSite"
              type="text"
              inputmode="url"
              autocomplete="off"
              spellcheck="false"
              :maxlength="SITE_MAX_LENGTH"
              class="field-control"
              placeholder="https://example.com"
              :aria-invalid="siteError ? 'true' : undefined"
              :aria-describedby="
                siteError ? 'fmhy-suggestion-site-error' : undefined
              "
              @input="handleSiteInput"
            />
            <p
              v-if="siteError"
              id="fmhy-suggestion-site-error"
              class="field-error"
            >
              {{ siteError }}
            </p>
          </div>
          <div class="field">
            <label class="field-label" for="fmhy-feedback-message">
              {{
                isSuggestionPath ? 'Describe your suggestion' : 'Your message'
              }}
            </label>
            <textarea
              id="fmhy-feedback-message"
              ref="textareaRef"
              v-model="feedback.message"
              autofocus
              class="field-control field-textarea"
              placeholder="(e.g. What a lovely wiki!)"
              :maxlength="
                isSuggestionPath ? suggestionDescriptionMax : undefined
              "
              :aria-invalid="
                isSuggestionPath &&
                descriptionTooShort &&
                feedback.message.length > 0
                  ? 'true'
                  : undefined
              "
              :aria-describedby="
                isSuggestionPath ? 'fmhy-feedback-message-hint' : undefined
              "
              @input="handleInput"
            />
            <div
              v-if="isSuggestionPath"
              id="fmhy-feedback-message-hint"
              class="counter-row"
            >
              <span
                class="field-hint"
                :class="{
                  'field-error':
                    descriptionTooShort && feedback.message.length > 0
                }"
              >
                {{ descriptionTooShort ? 'min 10' : '' }}
              </span>
              <span class="char-counter">{{ suggestionRemaining }} left</span>
            </div>
          </div>
          <div class="toolbar">
            <button
              type="button"
              class="tool-btn"
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
            <span v-if="isSelectingLine" class="tool-hint animate-pulse">
              Click any text on the page...
            </span>
          </div>
          <div class="field">
            <label class="field-label" for="fmhy-feedback-contact">
              Contact
              <span class="field-optional">optional</span>
            </label>
            <p class="desc">Only if you want a reply.</p>
            <input
              id="fmhy-feedback-contact"
              v-model="feedback.contact"
              type="text"
              class="field-control"
              placeholder="(e.g. Discord: username)"
              @input="error = null"
            />
          </div>
          <div class="btn-row">
            <button
              type="submit"
              class="btn btn-primary btn-submit"
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
/* One spacing scale: 6 / 8 / 12 / 16 / 24. One type scale: 12 / 13 / 14 / 16. */
.feedback-card {
  font-size: 14px;
  padding: 24px;
}

.pitch {
  display: flex;
  flex-wrap: wrap;
  margin-top: 0.5rem;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 16px;
  border: 2px solid var(--vp-c-divider);
  border-radius: 12px;
  background-color: var(--vp-c-bg-alt);
}

.pitch-pill {
  flex: none;
  margin-left: auto;
  padding: 10px 18px;
  border: 1px solid var(--vp-button-brand-border);
  border-radius: 9999px;
  background-color: var(--vp-button-brand-bg);
  color: var(--vp-button-brand-text);
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  white-space: nowrap;
  transition:
    background-color 0.2s,
    border-color 0.2s;
}

.pitch-pill:hover {
  background-color: var(--vp-button-brand-hover-bg);
  border-color: var(--vp-button-brand-hover-border);
}

.pitch-pill:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

@media (max-width: 420px) {
  .pitch-pill {
    width: 100%;
    margin-left: 0;
    text-align: center;
  }
}

.pitch-icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 9999px;
  background-color: var(--vp-c-brand-3);
  color: #fff;
}

.pitch-icon-glyph {
  width: 22px;
  height: 22px;
}

.pitch-text {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.pitch-title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--vp-c-text-1);
}

.pitch-sub {
  font-size: 13px;
  font-weight: 400;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

.feedback-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.head-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  transition:
    border-color 0.2s,
    background-color 0.2s;
}

.head-back:hover {
  border-color: var(--vp-c-brand-1);
  background-color: var(--vp-c-default-soft);
}

.head-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.heading {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--vp-c-text-1);
}

.step-sub {
  margin: 4px 0 0;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

.step-link {
  color: var(--vp-c-brand-1);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.error-msg {
  margin: 0 0 16px;
  padding: 10px 12px;
  border: 1px solid var(--vp-c-danger-1);
  border-radius: 8px;
  background-color: var(--vp-c-danger-soft);
  color: var(--vp-c-danger-1);
  font-size: 12px;
  line-height: 1.5;
}

.error-lead {
  font-weight: 600;
}

.quote-block {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 16px;
  padding: 10px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background-color: var(--vp-c-bg);
}

.quote-icon {
  flex: none;
  margin-top: 2px;
  color: var(--vp-c-text-2);
}

.quote-text {
  flex: 1 1 auto;
  min-width: 0;
  color: var(--vp-c-text-2) !important;
  font-size: 12px;
  font-style: italic;
  line-height: 1.5;
}

.quote-text :deep(*) {
  margin: 0 !important;
  color: inherit !important;
}

.quote-remove {
  flex: none;
  padding: 2px;
  border: 1px solid transparent;
  border-radius: 4px;
  color: var(--vp-c-text-2);
  transition:
    border-color 0.2s,
    color 0.2s;
}

.quote-remove:hover {
  border-color: var(--vp-c-divider);
  color: var(--vp-c-danger-1);
}

.field {
  margin-top: 20px;
}

.counter-row .field-error {
  margin: 0;
}

.feedback-head + .heading,
.heading + .step-sub {
  margin-top: 0;
}

.field-label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--vp-c-text-1);
}

.field-optional {
  margin-left: 4px;
  font-size: 12px;
  font-weight: 400;
  color: var(--vp-c-text-2);
}

.field-control {
  display: block;
  width: 100%;
  box-sizing: border-box;
  padding: 8px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.field-control::placeholder {
  color: var(--vp-c-text-3);
}

.field-control:hover {
  border-color: var(--vp-c-text-3);
}

.field-control:focus-visible {
  outline: none;
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft);
}

.field-control[aria-invalid='true'] {
  border-color: var(--vp-c-danger-1);
}

.field-textarea {
  padding: 10px 12px;
  min-height: 104px;
  max-height: 400px;
  resize: none;
  overflow-y: auto;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  padding: 6px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  white-space: nowrap;
  transition:
    border-color 0.2s,
    background-color 0.2s,
    color 0.2s;
}

.chip:hover {
  border-color: var(--vp-c-text-2);
  background-color: var(--vp-c-default-soft);
}

.option-btn {
  padding: 8px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background-color: var(--vp-c-default-soft);
  color: var(--vp-c-text-1);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  text-align: left;
  transition:
    border-color 0.2s,
    background-color 0.2s;
}

.option-btn:hover {
  border-color: var(--vp-c-brand-1);
}

.options {
  margin-top: 12px;
}

.chip-active {
  border-color: var(--vp-c-brand-1);
  background-color: var(--vp-c-brand-soft);
  color: var(--vp-c-text-1);
  font-weight: 600;
}

.counter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 6px;
}

.field-hint,
.char-counter {
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

.char-counter {
  white-space: nowrap;
}

.field-error {
  margin: 6px 0 0;
  color: var(--vp-c-danger-1);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  transition:
    border-color 0.2s,
    color 0.2s;
}

.tool-btn:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-text-1);
}

.tool-hint {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.desc {
  display: block;
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

.btn-row {
  display: flex;
  margin-top: 24px;
}

.btn {
  border: 1px solid var(--vp-c-divider);
  background-color: var(--vp-c-bg);
  border-radius: 8px;
  transition:
    border-color 0.2s,
    background-color 0.2s;
  display: inline-block;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  margin: 0;
  padding: 8px 16px;
  text-align: center;
  vertical-align: middle;
  white-space: nowrap;
  color: var(--vp-c-text-1);
}

.btn:disabled {
  opacity: 1;
  background-color: var(--vp-c-default-soft);
  border-color: var(--vp-c-divider);
  color: var(--vp-c-text-2);
  cursor: not-allowed;
}

.btn:hover {
  border-color: var(--vp-c-brand-1);
}

.btn:focus-visible,
.chip:focus-visible,
.option-btn:focus-visible,
.head-back:focus-visible,
.tool-btn:focus-visible,
.quote-remove:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
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

.btn-primary:disabled:hover {
  background-color: var(--vp-c-default-soft);
  border-color: var(--vp-c-divider);
}

.btn-submit {
  width: 100%;
}

@media (min-width: 640px) {
  .btn-submit {
    width: auto;
    min-width: 180px;
  }
}

@media (max-width: 420px) {
  .feedback-card {
    padding: 16px;
  }
}

.feedback-quote {
  color: var(--vp-c-text-2) !important;
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
