<script setup lang="ts">
// Import necessary functions and components from Vue and VitePress
import { reactive, ref } from 'vue'
import { useRouter } from 'vitepress'
import { type FeedbackType, getFeedbackOption, feedbackOptions } from '../../types/Feedback'

// Define reactive loading, error, and success states
const loading = ref<boolean>(false)
const error = ref<unknown>(null)
const success = ref<boolean>(false)

// Initialize the router
const router = useRouter()

// Initialize the reactive feedback object
const feedback = reactive<FeedbackType>({ message: '' })

/*
  Define the handleSubmit function which accepts an optional type parameter
  of FeedbackType. This function sets the feedback.type property, sets
  the loading state to true, and then proceeds to send a POST request to
  the feedback API endpoint with the feedback data as JSON in the request
  body. It handles errors and updates the appropriate states accordingly.
*/
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
    <!-- Conditionally render the feedback steps based on the feedback states -->
    <Transition name="fade" mode="out-in">
      <div v-if="!feedback.type" class="step">
        <!-- Heading for the feedback page -->
        <div>
          <div>
            <p class="heading">Feedback</p>
          </div>
        </div>
        <!-- Container for the feedback buttons -->
        <div class="button-container">
          <!-- Render the feedback buttons using v-for and pass the appropriate type value -->
          <button
            v-for="item in feedbackOptions"
            :key="item.value"
            class="btn"
            @click="handleSubmit(item.value as FeedbackType['type'])"
          >
            <!-- Button label -->
            <span>{{ item.label }}</span>
          </button>
        </div>
      </div>
      <div v-else-if="feedback.type && !success" class="step">
        <!-- Page path and feedback type -->
        <div>
          <p class="desc">Page: {{ router.route.path }}</p>
          <div>
            <!-- Feedback type label -->
            <span>{{ getFeedbackOption(feedback.type)?.label }}</span>
            <!-- Button to close the current feedback type -->
            <button
              style="margin-left: 0.5rem"
              class="btn"
              @click="feedback.type = undefined"
            >
              <span class="i-carbon-close-large">close</span>
            </button>
          </div>
        </div>
        <!-- Container for the textarea and additional information -->
        <div v-if="feedback.type === 'suggestion'" class="text-sm mb-2">
          <!-- Suggestions for different types of feedback -->
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
          <!-- More suggestions for different types of feedback -->
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
          <!-- More suggestions for different types of feedback -->
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
          <!-- Information about inappropriate feedback -->
          <strong>🎲 Mining / Betting Sites</strong>
          <p class="desc">
            Don't post anything related to betting, mining, BINs, CCs, etc.
          </p>
          <!-- Information about multiplayer game hacks -->
          <strong>🎮 Multiplayer Game Hacks</strong>
          <p class="desc">
            Don't post any hacks/exploits that give unfair advantages in
            multiplayer games.
          </p>
        </div>
        <!-- Textarea for user feedback -->
        <textarea
          v-model="feedback.message"
          autofocus
          class="input"
          placeholder="What a lovely wiki!"
        />
        <!-- Additional information about contacting the team -->
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
        <!-- Button to submit the feedback -->
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="
            feedback.message.length < 5 || feedback.message.length > 1000
          "
          @click="handleSubmit()"
        >
          <!-- Button label -->
          Submit
        </button>
      </div>
      <div v-else class="step">
        <!-- Heading for the success step -->
        <p class="heading">Thanks for your feedback!</p>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
// Styling for the component
</style>
