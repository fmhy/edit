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
  type?: FeedbackType['type']
}>({
  page: router.route.path,
  message: ''
})

const selectedOption = ref(feedbackOptions[0])

async function handleSubmit(type?: FeedbackType['type']) {
  if (type) {
    feedback.type = type
    selectedOption.value = getFeedbackOption(type)!
  }
  loading.value = true

  const body: FeedbackType = {
    message: feedback.message,
    type: feedback.type!,
    page: feedback.page,
    ...(props.heading && { heading: props.heading })
  }

  try {
    const response = await fetch('https://api.fmhy.net/feedback', {
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
  } catch (err) {
    error.value = err
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
</script>

<template>
  <template v-if="props.heading">
    <button
      @click="toggleCard()"
      class="bg-$vp-c-default-soft text-primary border-$vp-c-default-soft hover:border-primary ml-3 inline-flex h-7 items-center justify-center whitespace-nowrap rounded-md border-2 border-solid px-1.5 py-3.5 text-sm font-medium transition-all duration-300 sm:h-6"
    >
      <span
        :class="isCardShown === false ? `i-lucide:mail` : `i-lucide:mail-x`"
      />
    </button>
  </template>
  <template v-else>
    <div
      class="mt-2 p-4 border-2 border-solid bg-brand-50 border-brand-300 dark:bg-brand-950 dark:border-brand-800 rounded-xl col-span-3 transition-colors duration-250"
    >
      <div class="flex items-start md:items-center gap-3">
        <div class="pt-1 md:pt-0">
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center bg-brand-500 dark:bg-brand-400"
          >
            <span
              :class="
                isCardShown === false
                  ? `i-lucide:mail w-6 h-6 text-white dark:text-brand-950`
                  : `i-lucide:mail-x w-6 h-6 text-white dark:text-brand-950`
              "
            />
          </div>
        </div>
        <div
          class="flex-grow flex items-start md:items-center gap-3 flex-col md:flex-row"
        >
          <div class="flex-grow">
            <div class="font-semibold text-brand-950 dark:text-brand-50">
              Got feedback?
            </div>
            <div class="text-sm text-brand-800 dark:text-brand-100">
              We'd love to know what you think about this page.
            </div>
          </div>
          <div>
            <button
              class="inline-block text-center rounded-full px-4 py-2.5 text-sm font-medium border-2 border-solid text-brand-700 border-brand-300 dark:text-brand-100 dark:border-brand-800"
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
              class="bg-bg border-$vp-c-default-soft hover:border-primary mt-2 select-none rounded border-2 border-solid font-bold transition-all duration-250 rounded-lg text-[14px] font-500 leading-normal m-0 px-3 py-1.5 text-center align-middle whitespace-nowrap"
              @click="handleSubmit(item.value)"
            >
              <span>{{ item.label }}</span>
            </button>
          </div>
        </div>
        <div v-else-if="feedback.type && !success">
          <div>
            <p class="desc">{{ helpfulDescription }} - {{ prompt }}</p>
            <span>{{ getFeedbackOption(feedback.type)?.label }}</span>
          </div>
          <p class="heading" v-text="message"></p>
          <div v-if="feedback.type === 'suggestion'" class="mb-2 text-sm">
            <details>
              <summary>
                <span class="ii-lucide-shield-x bg-cerise-400 mb-1 ml-1" />
                Do not submit any of the following:
              </summary>
              <strong>🕹️ Emulators</strong>
              <p class="desc">
                They're already on the
                <a
                  class="text-primary text-underline font-bold"
                  href="https://emulation.gametechwiki.com/index.php/Main_Page"
                >
                  Game Tech Wiki.
                </a>
              </p>
              <strong>🔻 Leeches</strong>
              <p class="desc">
                They're already on the
                <a
                  class="text-primary text-underline font-bold"
                  href="https://filehostlist.miraheze.org/wiki/Free_Premium_Leeches"
                >
                  File Hosting Wiki.
                </a>
              </p>
              <strong>🐧 Distros</strong>
              <p class="desc">
                They're already on
                <a
                  class="text-primary text-underline font-bold"
                  href="https://distrowatch.com/"
                >
                  DistroWatch.
                </a>
              </p>
              <strong>🎲 Mining / Betting Sites</strong>
              <p class="desc">
                Don't post anything related to betting, mining, BINs, CCs, etc.
              </p>
              <strong>🎮 Multiplayer Game Hacks</strong>
              <p class="desc">
                Don't post any hacks/exploits that give unfair advantages in
                multiplayer games.
              </p>
            </details>
          </div>
          <textarea
            v-model="feedback.message"
            autofocus
            class="bg-$vp-c-bg-alt text-$vp-c-text-2 w-full h-[100px] border border-$vp-c-divider rounded px-3 py-1.5 border-$vp-c-divider bg-$vp-c-bg-alt b-rd-4 border-2 border-solid"
            placeholder="What a lovely wiki!"
          />
          <p class="desc mb-2">
            If you want a reply to your feedback, feel free to mention a contact
            in the message or join our
            <a
              class="text-primary text-underline font-semibold"
              href="https://rentry.co/FMHY-Invite/"
            >
              Discord.
            </a>
          </p>
          <div class="flex flex-row gap-2">
            <button
              class="bg-$vp-c-default-soft text-primary border-$vp-c-default-soft inline-flex h-7 items-center justify-center whitespace-nowrap rounded-md border-2 border-solid px-1.5 py-3.5 text-sm font-medium transition-all duration-300 sm:h-6"
              @click="feedback.type = undefined"
            >
              <span class="i-lucide:panel-left-close">close</span>
            </button>
            <button
              type="submit"
              class="border border-div rounded-lg transition-colors duration-250 inline-block text-14px font-500 leading-1.5 px-3 py-3 text-center align-middle whitespace-nowrap disabled:opacity-50 text-text-2 bg-brand-100 dark:bg-brand-700 border-brand-800 dark:border-brand-700 disabled:bg-brand-100 dark:disabled:bg-brand-900 hover:border-brand-900 dark:hover:border-brand-800 hover:bg-brand-200 dark:hover:bg-brand-800"
              :disabled="isDisabled"
              @click="handleSubmit()"
            >
              Send Feedback 📩
            </button>
          </div>
        </div>
        <div v-else>
          <p class="heading">Thanks for your feedback!</p>
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
  color: #fff;
  background-color: var(--vp-c-brand);
  border-color: var(--vp-c-brand);
}

.btn-primary:hover {
  background-color: var(--vp-c-brand-darker);
  border-color: var(--vp-c-brand-darker);
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
