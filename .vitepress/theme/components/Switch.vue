<script setup>
import { ref } from 'vue'
import { Switch } from '@headlessui/vue'

const enabled = ref(false)
const switchRef = ref(null)

const toggleSwitch = () => {
  enabled.value = !enabled.value
}

const handleDisabled = () => {
  // Handle disabled state
}

const handleFocus = () => {
  // Handle focus event
}

const handleBlur = () => {
  // Handle blur event
}
</script>

<template>
  <Switch
    ref="switchRef"
    v-model="enabled"
    :class="{ enabled }"
    :checked="enabled"
    @click="toggleSwitch"
    @disabled="handleDisabled"
    @focus="handleFocus"
    @blur="handleBlur"
    :data-state="enabled ? 'checked' : 'unchecked'"
    :data-testid="`switch-${enabled ? 'checked' : 'unchecked'}`"
    :disabled="disabled"
    :readonly="readonly"
    :size="size"
    :variant="variant"
    :color="color"
    :theme="theme"
    :shape="shape"
    :track="{
      '--vp-input-switch-bg-color': trackColor,
      '--vp-input-switch-border-color': trackBorderColor,
    }"
    :thumb="{
      '--vp-input-switch-thumb-bg-color': thumbColor,
      '--vp-input-switch-thumb-border-color': thumbBorderColor,
    }"
    :before="{
      '--vp-input-switch-before-bg-color': beforeColor,
      '--vp-input-switch-before-border-color': beforeBorderColor,
    }"
    :after="{
      '--vp-input-switch-after-bg-color': afterColor,
      '--vp-input-switch-after-border-color': afterBorderColor,
    }"
  >
    <span class="sr-only">{{ enabled ? 'Enabled' : 'Disabled' }}</span>
    <slot>{{ enabled ? 'On' : 'Off' }}</slot>
  </Switch>
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
  cursor: pointer;
  outline: none;
}

.switch.enabled {
  background-color: var(--vp-c-brand);
}

.switch:focus {
  box-shadow: 0 0 0 2px var(--vp-c-brand);
}

.switch:focus-within {
  box-shadow: 0 0 0 2px var(--vp-c-brand);
}

.switch:disabled {
  background-color: var(--vp-input-switch-disabled-bg-color);
  border-color: var(--vp-input-switch-disabled-border-color);
  cursor: not-allowed;
}

.switch:read-only {
  background-color: var(--vp-input-switch-readonly-bg-color);
  border-color: var(--vp-input-switch-readonly-border-color);
  cursor: not-allowed;
}

.switch.enabled:focus {
  box-shadow: 0 0 0 2px var(--vp-c-brand);
}

.switch.enabled:focus-within {
  box-shadow: 0 0 0 2px var(--vp-c-brand);
}

.switch.enabled:disabled {
  background-color: var(--vp-input-switch-disabled-bg-color);
  border-color: var(--vp-input-switch-disabled-border-color);
  cursor: not-allowed;
}

.switch.enabled:read-only {
  background-color: var(--vp-input-switch-readonly-bg-color);
  border-color: var(--vp-input-switch-readonly-border-color);
  cursor: not-allowed;
}

.switch:hover:not(:disabled):not(:read-only) {
  border-color: var(--vp-input-hover-border-color);
}

.thumb {
  display: inline-block;
  background-color: #fff;
  transition: transform 0.25s;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  box-shadow: var(--vp-shadow-1);
}

.switch.enabled .thumb {
  transform: translateX(18px);
}

.switch:disabled .thumb,
.switch:read-only .thumb {
  background-color: var(--vp-input-switch-disabled-thumb-bg-color);
  box-shadow: none;
}

.switch:disabled .thumb:hover,
.switch:read-only .thumb:hover {
  background-color: var(--vp-input-switch-disabled-thumb-bg-color);
  box-shadow: none;
}

.switch.enabled:disabled .thumb,
.switch.enabled:read-only .thumb {
  background-color: var(--vp-input-switch-disabled-thumb-bg-color);
  box-shadow: none;
}

.switch.enabled:disabled .thumb:hover,
.switch.enabled:read-only .thumb:hover {
  background-color: var(--vp-input-switch-disabled-thumb-bg-color);
  box-shadow: none;
}

.switch[data-state="checked"]:not(:disabled):not(:read-only):hover .thumb {
  background-color: var(--vp-input-switch-checked-hover-thumb-bg-color);
}

.switch[data-state="unchecked"]:not(:disabled):not(:read-only):hover .thumb {
  background-color: var(--vp-input-switch-unchecked-hover-thumb-bg-color);
}

.switch[data-state="checked"]:not(:disabled):not(:read-only) .thumb {
  background-color: var(--vp-input-switch-checked-thumb-bg-color);
}

.switch[data-state="unchecked"]:not(:disabled):not(:read-only) .thumb {
  background-color: var(--vp-input-switch-unchecked-thumb-bg-color);
}

.switch[data-state="checked"]:not(:disabled):not(:read-only):active .thumb {
  background-color: var(--vp-input-switch-checked-active-thumb-bg-color);
}

.switch[data-state="unchecked"]:not(:disabled):not(:read-only):active .thumb {
  background-color: var(--vp-input-switch-unchecked-active-thumb-bg-color);
}

.switch[data-state="checked"]:not(:disabled):not(:read-only):focus .thumb {
  background-color: var(--vp-input-switch-checked-focus-thumb-bg-color);
}

.switch[data-state="unchecked"]:not(:disabled):not(:read-only):focus .thumb {
  background-color: var(--vp-input-switch-unchecked-focus-thumb-bg-color);
}

.switch[data-state="checked"]:not(:disabled):not(:read-only):focus-within .thumb {
  background-color: var(--vp-input-switch-checked-focus-thumb-bg-color);
}

.switch[data-state="unchecked"]:not(:disabled):not(:read-only):focus-within .thumb {
  background-color: var(--vp-input-switch-unchecked-focus-thumb-bg-color);
}

.switch[data-state="checked"]:disabled .thumb,
.switch[data-state="checked"]:read-only .thumb {
  background-color: var(--vp-input-switch-disabled-checked-thumb-bg-color);
}

.switch[data-state="unchecked"]:disabled .thumb,
.switch[data-state="unchecked"]:read-only .thumb {
  background-color: var(--vp-input-switch-disabled-unchecked-thumb-bg-color);
}

.switch[data-state="checked"]:disabled .thumb:hover,
.switch[data-state="checked"]:read-only .thumb:hover {
  background-color: var(--vp-input-switch-disabled-checked-thumb-bg-color);
}

.switch[data-state="unchecked"]:disabled .thumb:hover,
.switch[data-state="unchecked"]:read-only .thumb:hover {
  background-color: var(--vp-input-switch-disabled-un
