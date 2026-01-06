<script setup lang="ts">
import { Switch as HeadlessSwitch } from '@headlessui/vue'

const props = defineProps<{
  modelValue: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
}>()
</script>

<template>
  <HeadlessSwitch
    :model-value="props.modelValue"
    :disabled="props.disabled"
    class="switch"
    :class="{ enabled: props.modelValue, disabled: props.disabled }"
    @update:modelValue="emit('update:modelValue', $event)"
  >
    <span class="thumb" />
  </HeadlessSwitch>
</template>

<style>
.switch {
  display: inline-flex;
  position: relative;
  width: 40px;
  height: 22px;
  flex-shrink: 0;
  border: 1px solid var(--vp-input-border-color);
  background-color: var(--vp-input-switch-bg-color);
  transition:
    border-color 0.25s,
    background-color 0.4s ease;
  border-radius: 11px;
}

.switch.enabled {
  background-color: var(--vp-c-brand);
}

.switch.disabled {
  opacity: 0.5;
  pointer-events: none;
  background-color: var(--vp-c-bg-soft, #2f2f2f);
  border-color: var(--vp-c-divider, #666);
}

.switch.disabled .thumb {
  background-color: #fff;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.2), var(--vp-shadow-1);
}

.dark .switch.disabled {
  background-color: #2f2f2f;
  border-color: #7d7d7d;
}
</style>

<style scoped>
.switch:hover {
  border-color: var(--vp-input-hover-border-color);
}

.thumb {
  display: inline-block;
  background-color: #fff;
  transition: transform 0.25s;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.08), var(--vp-shadow-1);
}

.switch.enabled .thumb {
  transform: translateX(18px);
}
</style>
