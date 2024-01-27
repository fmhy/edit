<script setup lang="ts">
import { reactive, ref } from 'vue'
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

async function handleSubmit(type?: FeedbackType['type']) {
  if (type) feedback.type = type
  loading.value = true

  const body: FeedbackType = {
    message: feedback.message,
    type: feedback.type,
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
</script>

<template>
  <div class="wrapper">
    <Transition name="fade" mode="out-in">
      <div v-if="!feedback.type" class="step">
        <div>
          <div>
            <p class="heading">Feedback</p>
          </div>
        </div>
        <div class="button-container">
          <button
            v-for="item in feedbackOptions"
            :key="item.value"
            class="btn"
            @click="handleSubmit(item.value as FeedbackType['type'])"
          >
            <span>{{ item.label }}</span>
          </button>
        </div>
      </div>
      <div v-else-if="feedback.type && !success" class="step">
        <div>
          <p class="desc">Page: {{ router.route.path }}</p>
          <div>
            <span>{{ getFeedbackOption(feedback.type)?.label }}</span>
            <button
              style="margin-left: 0.5rem"
              class="btn"
              @click="feedback.type = undefined"
            >
              <span class="i-carbon-close-large">close</span>
            </button>
          </div>
        </div>
        <div v-if="feedback.type === 'suggestion'" class="text-sm mb-2">
          <strong>🕹️ Emulators</strong>
          <p class="desc">
            They're already on the
            <a
              class="text-primary font-bold text-underline"
              href="https://emulation.gametechwiki.com/index.php/Main_Page"
            >
              Game Tech Wiki.
            </a>
          </p>
          <strong>🔻 Leeches</strong>
          <p class="desc">
            They're already on the
            <a
              class="text-primary font-bold text-underline"
              href="https://filehostlist.miraheze.org/wiki/Free_Premium_Leeches"
            >
              File Hosting Wiki.
            </a>
          </p>
          <strong>🐧 Distros</strong>
          <p class="desc">
            They're already on
            <a
              class="text-primary font-bold text-underline"
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
            class="text-primary font-semibold text-underline"
            href="https://discord.gg/Stz6y6NgNg"
          >
            Discord.
          </a>
        </p>
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="
            feedback.message.length < 5 || feedback.message.length > 1000
          "
          @click="handleSubmit()"
        >
          Submit
        </button>
      </div>
      <div v-else class="step">
        <p class="heading">Thanks for your feedback!</p>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
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

.button-container {
  display: grid;
  grid-gap: 0.5rem;
}

.wrapper {
  margin: 2rem 0;
  padding: 1.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-alt);
}

.input {
  width: 100%;
  height: 100px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0.375rem 0.75rem;
}

.contact-input {
  height: 50px;
  border: 1px solid #ccc;
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
