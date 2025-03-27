<script setup lang="ts">
import VPIconMoon from 'vitepress/dist/client/theme-default/components/icons/VPIconMoon.vue'
import VPIconSun from 'vitepress/dist/client/theme-default/components/icons/VPIconSun.vue'

const { isDark } = useData()

const toggleAppearance = inject('toggle-appearance', () => {
  isDark.value = !isDark.value
})

const supportsViewTransition = ref(false)

onMounted(() => {
  supportsViewTransition.value =
    'startViewTransition' in document &&
    window.matchMedia('(prefers-reduced-motion: no-preference)').matches
})
</script>

<template>
  <button
    type="button"
    role="switch"
    title="VPSwitchAppearance"
    class="VPSwitchAppearance"
    :aria-checked="isDark"
    :data-view-transition="supportsViewTransition"
    @click="toggleAppearance"
  >
    <ClientOnly>
      <Transition name="fade" mode="out-in">
        <div v-if="!isDark" class="sun text-xl i-ph-sun-duotone" />
        <div v-else class="moon text-xl i-ph-moon-duotone" />
      </Transition>
    </ClientOnly>
  </button>
</template>

<style lang="scss" scoped>
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

  &[data-view-transition='false'] {
    .fade-enter-active,
    .fade-leave-active {
      transition: opacity 0.1s ease;
    }

    .fade-enter-from,
    .fade-leave-to {
      opacity: 0;
    }
  }
}
</style>
