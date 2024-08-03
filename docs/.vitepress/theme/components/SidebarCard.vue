<script setup lang="ts">
import Field from './CardField.vue'
import Feedback from './Feedback.vue'
import InputField from './InputField.vue'
import ToggleStarred from './ToggleStarred.vue'
</script>

<template>
  <div class="card">
    <div class="card-header">
      <div class="card-title">Emoji Legend</div>
    </div>
    <Field icon="i-twemoji-globe-with-meridians">Indexes</Field>
    <Field icon="i-twemoji-repeat-button">Storage Links</Field>
    <Field icon="i-twemoji-star">Recommendations</Field>
    <div class="card-header">
      <div class="card-title">Options</div>
    </div>
    <InputField id="feedback" label="Feedback">
      <template #display>
        <Feedback />
      </template>
    </InputField>
    <InputField id="toggle-starred" label="Toggle Starred">
      <template #display>
        <ToggleStarred />
      </template>
    </InputField>
  </div>
</template>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.card-title {
  font-weight: 700;
  color: var(--vp-c-text-1);
  line-height: 32px;
  font-size: 16px;
}

.card {
  background: var(--vp-c-bg);
  padding: 12px 24px 24px;
  border-radius: 12px;
  position: relative;
  z-index: 0;
  border: 1px solid transparent;
  transition: border-color 0.4s ease-in-out;
}

.card:hover {
  border-color: var(--vp-c-brand-1);
}
</style>
