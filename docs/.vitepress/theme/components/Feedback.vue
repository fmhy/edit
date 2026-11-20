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
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const siteInputRef = ref<HTMLInputElement | null>(null)

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
}>({
  page: router.route.path,
  message: '',
  contact: ''
})

type SuggestionKind = 'add' | 'remove' | 'dead' | 'other'

const MAX_MESSAGE_LENGTH = 1000
const MIN_MESSAGE_LENGTH = 5
const MIN_SUGGESTION_DESCRIPTION = 10
const SITE_MAX_LENGTH = 200
// The route's own `page` rule: 3 to 25 characters, no query, no hash.
const PAGE_MIN_LENGTH = 3
const PAGE_MAX_LENGTH = 25
const PAGE_PATTERN = /^[a-zA-Z0-9\-/]+$/
const SITE_ORIGIN = 'https://fmhy.net'

const suggestionKinds: { value: SuggestionKind; label: string }[] = [
  { value: 'add', label: 'Add a site' },
  { value: 'remove', label: 'Remove a site' },
  { value: 'dead', label: 'Site is dead' },
  { value: 'other', label: 'Something else' }
]

const suggestionKind = ref<SuggestionKind | null>(null)
const suggestionSite = ref('')
const isPickingLink = ref(false)
const pickNote = ref('')

const isSuggestionPath = computed(() => feedback.type === 'suggestion')

const kindLabel = computed(
  () =>
    suggestionKinds.find((kind) => kind.value === suggestionKind.value)
      ?.label ?? ''
)

const trimmedSite = computed(() => suggestionSite.value.trim())

/**
 * Turns a clicked link into the short same-site route the page field expects:
 * resolve it, keep only the pathname, decode percent-escapes, drop trailing
 * slashes, lowercase. Anything that cannot become a short same-site route -
 * another domain, mailto:, javascript:, a bare #anchor, or a path that is too
 * long or holds characters the route rejects - returns null and is refused
 * instead of being mangled into a different page.
 */
function linkToRoute(href: string, base: string): string | null {
  const raw = href.trim()
  if (!raw || raw.startsWith('#')) return null
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^https?:/i.test(raw)) return null

  let url: URL
  let origin: string
  try {
    url = new URL(raw, base)
    origin = new URL(base).origin
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (url.origin !== origin) return null

  let path = url.pathname
  try {
    path = decodeURIComponent(path)
  } catch {
    return null
  }
  path = path.replace(/\/+$/, '').toLowerCase()
  if (!path) path = '/'
  if (path.length < PAGE_MIN_LENGTH || path.length > PAGE_MAX_LENGTH)
    return null
  if (!PAGE_PATTERN.test(path)) return null
  return path
}

/**
 * A picked link lands in the field as a short route, because that is the form
 * the page field is meant to hold. The message is read by a human, so the route
 * is written out as a full fmhy.net link there; a pasted URL is left alone.
 */
const siteForMessage = computed(() => {
  const site = trimmedSite.value
  if (!site) return ''
  return site.startsWith('/') ? `${SITE_ORIGIN}${site}` : site
})

const suggestionHead = computed(() => {
  if (!isSuggestionPath.value || !kindLabel.value) return ''
  const site = siteForMessage.value ? ` ${siteForMessage.value}` : ''
  return `[${kindLabel.value}]${site}`
})

const siteError = computed(() => {
  if (!isSuggestionPath.value) return ''
  const site = trimmedSite.value
  if (!site) return ''
  if (site.length > SITE_MAX_LENGTH)
    return 'Keep the link under 200 characters, please.'
  // A full link or a site route; the picker writes routes.
  if (/^https?:\/\//i.test(site) || site.startsWith('/')) return ''
  return 'Enter a link starting with http:// or https://, or a route like /privacy'
})

const suggestionPrefix = computed(() => {
  if (!isSuggestionPath.value || !kindLabel.value) return ''
  return `${suggestionHead.value}\n\n`
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

const PICKABLE_SELECTOR = '.vp-doc a[href]'
const PICK_CLASS = 'feedback-link-pick'

/**
 * Only real links inside the article count, never a link inside the card
 * itself. `closest` keeps a click on a nested span working like a click on the
 * anchor underneath it.
 */
function pickableAnchor(target: EventTarget | null) {
  const element = target as HTMLElement | null
  const anchor = element?.closest?.(
    PICKABLE_SELECTOR
  ) as HTMLAnchorElement | null
  if (!anchor || anchor.closest('.feedback-widget')) return null
  return anchor
}

function clearPickHighlight() {
  if (typeof document === 'undefined') return
  document
    .querySelectorAll(`a.${PICK_CLASS}`)
    .forEach((el) => el.classList.remove(PICK_CLASS))
}

function handlePickHover(event: MouseEvent) {
  const anchor = pickableAnchor(event.target)
  clearPickHighlight()
  if (anchor) anchor.classList.add(PICK_CLASS)
}

function handlePickClick(event: MouseEvent) {
  const anchor = pickableAnchor(event.target)
  if (!anchor) return

  // Picking must never navigate away from the page being described.
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()

  const route = linkToRoute(
    anchor.getAttribute('href') ?? '',
    window.location.href
  )
  stopPickingLink()
  if (!route) {
    pickNote.value =
      'Only fmhy.net page links with a short path can be picked here.'
    return
  }
  suggestionSite.value = route
  pickNote.value = ''
  error.value = null
  // Focus goes to the field the pick filled, so the next keystroke edits it.
  siteInputRef.value?.focus()
}

function handlePickKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') stopPickingLink()
}

function startPickingLink() {
  pickNote.value = ''
  isPickingLink.value = true
  if (typeof document === 'undefined') return
  document.body.classList.add('feedback-picking-links')
  document.addEventListener('mouseover', handlePickHover)
  document.addEventListener('focusin', handlePickHover)
  document.addEventListener('click', handlePickClick, { capture: true })
  document.addEventListener('keydown', handlePickKeydown)
}

function stopPickingLink() {
  isPickingLink.value = false
  // Nothing here may run during a server render: there is no document.
  if (typeof document === 'undefined') return
  document.body.classList.remove('feedback-picking-links')
  document.removeEventListener('mouseover', handlePickHover)
  document.removeEventListener('focusin', handlePickHover)
  document.removeEventListener('click', handlePickClick, { capture: true })
  document.removeEventListener('keydown', handlePickKeydown)
  clearPickHighlight()
}

function togglePickingLink() {
  if (isPickingLink.value) {
    stopPickingLink()
  } else {
    startPickingLink()
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', stopPickingLink)
})

onUnmounted(() => {
  stopPickingLink()
  window.removeEventListener('beforeunload', stopPickingLink)
})

function selectSuggestionKind(kind: SuggestionKind) {
  suggestionKind.value = kind
  error.value = null
}

function buildMessage() {
  // The description is exactly what the contributor sees, so the payload is
  // only ever the kind/site line plus that visible text.
  if (!isSuggestionPath.value || !kindLabel.value) {
    return feedback.message
  }
  return `${suggestionPrefix.value}${feedback.message}`
}

/**
 * The composed message must stay inside the schema limit, so the description
 * budget shrinks when the kind or the site changes. Clamp what is already
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

  return (
    feedback.message.length < MIN_MESSAGE_LENGTH ||
    feedback.message.length > MAX_MESSAGE_LENGTH
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

function selectType(type: FeedbackType['type']) {
  feedback.type = type
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
  if (!isCardShown.value) stopPickingLink()
}
const goBackToOptions = () => {
  feedback.type = undefined
  error.value = null
  pickNote.value = ''
  stopPickingLink()
}

const resetFeedback = () => {
  // Back to the form, not to the pitch or the category choice: the category
  // the contributor already chose is kept.
  error.value = null
  success.value = false
  feedback.message = ''
  suggestionKind.value = null
  suggestionSite.value = ''
  pickNote.value = ''
  stopPickingLink()
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
          <div v-if="isSuggestionPath" class="field field-related">
            <label class="field-label" for="fmhy-suggestion-site">
              Site or page
              <span class="field-optional">optional</span>
            </label>
            <input
              id="fmhy-suggestion-site"
              ref="siteInputRef"
              v-model="suggestionSite"
              type="text"
              inputmode="url"
              autocomplete="off"
              spellcheck="false"
              :maxlength="SITE_MAX_LENGTH"
              class="field-control"
              placeholder="https://example.com or /privacy"
              :aria-invalid="siteError ? 'true' : undefined"
              :aria-describedby="
                siteError ? 'fmhy-suggestion-site-error' : undefined
              "
            />
            <p
              v-if="siteError"
              id="fmhy-suggestion-site-error"
              class="field-error"
            >
              {{ siteError }}
            </p>
            <p class="sr-only" role="status" aria-live="polite">
              {{
                isPickingLink ? 'Picking a link. Press Escape to cancel.' : ''
              }}
              {{ pickNote }}
            </p>
            <div class="field-actions">
              <button
                type="button"
                class="tool-btn"
                :aria-pressed="isPickingLink"
                :aria-describedby="isPickingLink ? 'fmhy-pick-note' : undefined"
                @click="togglePickingLink()"
              >
                <span
                  :class="isPickingLink ? 'i-lucide:x' : 'i-lucide:link-2'"
                  class="w-3.5 h-3.5"
                ></span>
                {{
                  isPickingLink ? 'Cancel selection' : 'Select a link from page'
                }}
              </button>
              <span v-if="isPickingLink" id="fmhy-pick-note" class="pick-note">
                Click a link on the page...
              </span>
              <span v-else-if="pickNote" class="pick-note">{{ pickNote }}</span>
            </div>
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
              :placeholder="
                isSuggestionPath
                  ? '(e.g. Great source for X, worth adding)'
                  : '(e.g. What a lovely wiki!)'
              "
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

.field {
  margin-top: 20px;
}

/* The kind chips and the site field answer one question, so they group. */
.field-related {
  margin-top: 12px;
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
  min-height: 128px;
  max-height: 400px;
  line-height: 1.6;
  resize: none;
  overflow-y: auto;
}

@media (max-width: 420px) {
  .field-textarea {
    min-height: 112px;
  }
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

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.field-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
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
    color 0.2s,
    background-color 0.2s;
}

.tool-btn:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-text-1);
}

.tool-btn[aria-pressed='true'] {
  border-color: var(--vp-c-brand-1);
  background-color: var(--vp-c-brand-soft);
  color: var(--vp-c-text-1);
}

.tool-btn:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.pick-note {
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--vp-c-text-2);
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
.head-back:focus-visible {
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
/* Armed link picking: the hovered anchor is the only thing highlighted, and it
   lives outside this component, so the rule cannot be scoped. */
body.feedback-picking-links,
body.feedback-picking-links a {
  cursor: pointer !important;
}

a.feedback-link-pick {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
  border-radius: 4px;
  background-color: var(--vp-c-brand-soft);
}
</style>
