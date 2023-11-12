<script setup lang="ts">
import { inject } from "vue";
import { useData } from "vitepress";

import VPIconMoon from "vitepress/dist/client/theme-default/components/icons/VPIconMoon.vue";
import VPIconSun from "vitepress/dist/client/theme-default/components/icons/VPIconSun.vue";

const { isDark } = useData();

const toggleAppearance = inject("toggle-appearance", () => {
  isDark.value = !isDark.value;
});
</script>

<template>
  <button
    type="button"
    role="switch"
    title="Toggle dark mode"
    class="VPSwitchAppearance"
    :aria-checked="isDark"
    @click="toggleAppearance">
    <ClientOnly>
      <Transition name="fade" mode="out-in">
        <VPIconSun v-if="!isDark" class="sun" />
        <VPIconMoon v-else class="moon" />
      </Transition>
    </ClientOnly>
  </button>
</template>

<style scoped>
.VPSwitchAppearance {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 36px;
  height: 36px;
  color: var(--vp-c-text-2);
  transition: color 0.5s;

  &:hover {
    color: var(--vp-c-text-1);
    transition: color 0.25s;
  }

  & > :deep(svg) {
    width: 20px;
    height: 20px;
    fill: currentColor;
  }
}
</style>
