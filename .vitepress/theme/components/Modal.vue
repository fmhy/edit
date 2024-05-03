<script setup lang="ts">
import { ref } from 'vue'
import Feedback from './Feedback.vue'

const showModal = ref(false)

const handleButtonClick = () => {
  showModal.value = true
}

const handleButtonKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    handleButtonClick()
  }
}

const handleModalMaskClick = () => {
  showModal.value = false
}

const handleModalKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    showModal.value = false
  }
}
</script>

<template>
  <button
    class="p-[4px 8px] text-xl i-carbon:user-favorite-alt-filled"
    type="button"
    aria-haspopup="dialog"
    aria-expanded="false"
    @click="handleButtonClick"
    @keydown="handleButtonKeydown"
  />

  <Teleport to="body">
    <Transition name="modal">
      <div
        v-show="showModal"
        class="modal-mask"
        @mousedown="handleModalMaskClick"
        @keydown="handleModalKeydown"
      >
        <div class="modal-container">
          <Feedback />
          <div class="model-footer">
            <button class="modal-button" @click="showModal = false" aria-label="Close">
              Close
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-mask {
  position: fixed;
  z-index: 200;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.modal-container {
  width: 300px;
  margin: auto;
  padding: 20px 30px;
  background-color: var(--vp-c-bg);
  border-radius: 2px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.33);
  opacity: 0;
  transform: scale(1.1);
  transition: opacity 0.3s ease, transform 0.3s ease 0.1s;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(1.1);
}

.modal-container.modal-enter-active,
.modal-container.modal-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease 0.1s;
}

.model-footer {
  margin-top: 8px;
  text-align: right;
}

.modal-button {
  padding: 4px 8px;
  border-radius: 4px;
  border-color: var(--vp-button-alt-border);
  color: var(--vp-button-alt-text);
  background-color: var(--vp-button-alt-bg);
}

.modal-button:hover {
  border-color: var(--vp-button-alt-hover-border);
  color: var(--vp-button-alt-hover-text);
  background-color: var(--vp-button-alt-hover-bg);
}
</style>
