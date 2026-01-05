<script setup>
import { Switch } from '@headlessui/vue'
import { ref } from 'vue'

const enabled = ref(false)
</script>

<template>
  <Switch v-model="enabled" class="switch" :class="{ enabled }">
    <span class="thumb" />
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
}

.switch.enabled {
  background-color: var(--vp-c-brand);
}

.switch.disabled {
  opacity: 0.5;
  pointer-events: none;
  background-color: var(--vp-c-bg-soft);
  border-color: var(--vp-c-divider);
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
  box-shadow: var(--vp-shadow-1);
}

.switch.enabled .thumb {
  transform: translateX(18px);
}
</style>
