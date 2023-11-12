<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRoute } from "vitepress";
import type { FeedbackType } from "../../types/Feedback";

const loading = ref<boolean>(false);
const error = ref<unknown>(null);
const success = ref<boolean>(false);
const { path } = useRoute();

const feedback = reactive<FeedbackType>({ message: "", contact: "" });

const feedbackOptions = [
  { label: "🐞 Bug", value: "bug" },
  {
    label: "♻️ Suggestion",
    value: "suggestion",
  },
  { label: "📂 Other", value: "other" },
  {
    label: "❤️ Appreciation",
    value: "appreciate",
  },
];

function getFeedbackOption(value: string) {
  return feedbackOptions.find((option) => option.value === value);
}

async function handleSubmit(type?: FeedbackType["type"]) {
  if (type) feedback.type = type;
  loading.value = true;

  const body: FeedbackType = {
    message: feedback.message,
    type: feedback.type,
    contact: feedback.contact,
    page: path,
  };

  try {
    const response = await fetch("https://feedback.tasky.workers.dev", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.error) {
      error.value = data.error;
      return;
    }
    if (data.status === "success") {
      success.value = true;
    }
  } catch (err) {
    error.value = err;
  } finally {
    loading.value = false;
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
          <button v-for="item in feedbackOptions" :key="item.value" class="btn"
            @click="handleSubmit(item.value as FeedbackType['type'])">
            <span>{{ item.label }}</span>
                 </button>
        </div>
      </div>
       <div v-else-if="feedback.type && !success" class="step">
        <div>
          <p class="desc">The wiki is... • {{ path }}</p>
          <div>
            <span>{{ getFeedbackOption(feedback.type)?.label }}</span>
            <button style="margin-left: 0.5rem" class="btn" @click="feedback.type = undefined">
              <span class="i-carbon-close-large">close</span>
            </button>
              </div>
        </div>
        <textarea v-model="feedback.message" autofocus class="input" />
        <p class="desc">Contacts, so we can get back to you. (Optional)</p>
        <textarea v-model="feedback.contact" class="contact-input" />
        <button type="submit" class="btn btn-primary" :disabled="feedback.message.length > 10" @click="handleSubmit()">
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
.step>*+* {
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
