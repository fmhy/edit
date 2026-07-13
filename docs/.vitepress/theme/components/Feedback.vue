<script setup lang="ts">
import type { FeedbackType } from '../../types/Feedback'
import { useRouter } from 'vitepress'
import { computed, reactive, ref } from 'vue'
import { feedbackOptions, getFeedbackOption } from '../../types/Feedback'

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

const isDisabled = computed(() => {
  return (
    !feedback.message.length ||
    feedback.message.length < 5 ||
    feedback.message.length > 1000
  )
})

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

const selectedOption = ref(feedbackOptions[0])

function selectType(type: FeedbackType['type']) {
  feedback.type = type
  selectedOption.value = getFeedbackOption(type)!
}

async function handleSubmit() {
  loading.value = true
  error.value = null

  const body: FeedbackType = {
    message: feedback.message,
    type: feedback.type!,
    page: feedback.page,
    ...(props.heading && { heading: props.heading }),
    ...(feedback.contact && { contact: feedback.contact })
  }

  try {
    const response = await fetch('http://192.168.1.30:3000/feedback', {
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
const toggleCard = () => (isCardShown.value = !isCardShown.value)
const resetFeedback = () => {
  feedback.type = undefined
  error.value = null
}
</script>

<template>
  <template v-if="props.heading">
    <button
      class="bg-$vp-c-default-soft text-primary border-$vp-c-default-soft hover:border-primary ml-3 inline-flex h-7 items-center justify-center whitespace-nowrap rounded-md border-2 border-solid px-1.5 py-3.5 text-sm font-medium transition-all duration-300 sm:h-6"
      @click="toggleCard()"
    >
      <span
        :class="isCardShown === false ? `i-lucide:mail` : `i-lucide:mail-x`"
      />
    </button>
  </template>
  <template v-else>
    <div
      class="mt-2 p-4 border-2 border-solid bg-$vp-c-bg-alt border-$vp-c-divider rounded-xl col-span-3 transition-colors duration-250"
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
      class="border-$vp-c-divider bg-$vp-c-bg-alt b-rd-4 m-[2rem 0] mt-4 border-2 border-solid p-6"
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
                @click="resetFeedback()"
                title="Back to options"
              >
                <span class="i-lucide:arrow-left w-4 h-4"></span>
              </button>
              <span>{{ getFeedbackOption(feedback.type!)?.label }}</span>
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
          <textarea
            v-model="feedback.message"
            autofocus
            class="bg-$vp-c-bg-alt text-$vp-c-text-2 w-full h-[100px] border border-$vp-c-divider rounded px-3 py-1.5 border-$vp-c-divider bg-$vp-c-bg-alt b-rd-4 border-2 border-solid"
            placeholder="What a lovely wiki!"
            @input="error = null"
          />
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
          <button
            class="btn btn-primary"
            @click="
              resetFeedback()
              success = false
            "
          >
            Send Another Message
          </button>
        </div>
      </Transition>
    </div>
  </Transition>
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
