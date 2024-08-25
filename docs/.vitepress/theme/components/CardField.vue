<script setup lang="ts">
defineProps<{
  icon: string
}>()
</script>

<template>
  <div class="g-[12px] mb-[8px] flex items-center">
    <span class="flex items-center">
      <div class="text-2xl" :class="icon" />
      <div class="ml-2 text-sm text-[var(--vp-c-text-2)]">
        <slot />
      </div>
    </span>
  </div>
</template>
