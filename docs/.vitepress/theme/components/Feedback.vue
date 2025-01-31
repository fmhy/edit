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
  bug: [
    "We're sorry to hear that!",
    'Please try to be as specific as possible and provide us with the steps to reproduce the bug.'
  ],
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
// prettier-ignore
const feedback = reactive<
  Pick<FeedbackType, 'message' | 'page'> & Partial<Pick<FeedbackType, 'type'>>
>({
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
      class="bg-$vp-c-default-soft hover:bg-$vp-c-default-soft/40 text-primary border-$vp-c-default-soft hover:border-primary ml-3 inline-flex h-7 items-center justify-center whitespace-nowrap rounded-md border-2 border-solid px-1.5 py-1.5 text-sm font-medium transition-all duration-300 sm:h-6"
    >
      <span
        :class="
          isCardShown === false
            ? `i-lucide:heart-handshake`
            : `i-lucide:circle-x`
        "
      />
    </button>
  </template>
  <template v-else>
    <button
      class="bg-$vp-c-default-soft hover:bg-$vp-c-default-soft/40 text-primary px2 py1 border-$vp-c-default-soft hover:border-primary mt-2 select-none rounded border-2 border-solid font-bold transition-all duration-300"
      @click="toggleCard()"
    >
      <span
        :class="
          isCardShown === false
            ? `i-lucide:heart-handshake mr-2`
            : `i-lucide:circle-x mr-2`
        "
      />
      <span>Send Feedback</span>
    </button>
  </template>

  <Transition name="fade" mode="out-in">
    <div
      v-if="isCardShown"
      class="border-$vp-c-divider bg-$vp-c-bg-alt b-rd-4 m-[2rem 0] step mt-4 border-2 border-solid p-6"
    >
      <Transition name="fade" mode="out-in">
        <div v-if="!feedback.type" class="step">
          <div>
            <div>
              <p class="desc">{{ prompt }}</p>
              <p class="heading">
                {{ helpfulText }}
              </p>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="item in feedbackOptions"
              :key="item.value"
              class="btn"
              @click="handleSubmit(item.value)"
            >
              <span>{{ item.label }}</span>
            </button>
          </div>
        </div>
        <div v-else-if="feedback.type && !success" class="step">
          <div>
            <p class="desc">
              {{ helpfulDescription }}
            </p>
            <div>
              <span>{{ getFeedbackOption(feedback.type)?.label }}</span>
              <button
                style="margin-left: 0.5rem"
                class="btn"
                @click="feedback.type = undefined"
              >
                <span class="i-lucide:arrow-left-from-line">close</span>
              </button>
            </div>
          </div>
          <p class="heading">
            {{ message }}
          </p>
          <div v-if="feedback.type === 'suggestion'" class="mb-2 text-sm">
            <details>
              <summary>
                <span class="i-lucide:shield-alert bg-cerise-400 mb-1 ml-1" />
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
            class="input"
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
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="isDisabled"
            @click="handleSubmit()"
          >
            Send Feedback 📩
          </button>
        </div>
        <div v-else class="step">
          <p class="heading">Thanks for your feedback!</p>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped lang="css">
.step > * + * {
  margin-top: 1rem;
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

.input {
  background-color: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
  width: 100%;
  height: 100px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 0.375rem 0.75rem;
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
