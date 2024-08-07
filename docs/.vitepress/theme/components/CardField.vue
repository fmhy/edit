<script setup lang="ts">
defineProps<{
  icon: string
}>()
</script>

<template>
  <div class="flex items-center mb-[8px] g-[12px]">
    <span class="flex items-center">
      <div class="text-2xl" :class="icon" />
      <div class="ml-2 text-sm text-[var(--vp-c-text-2)]">
        <slot />
      </div>
    </span>
  </div>
</template>
