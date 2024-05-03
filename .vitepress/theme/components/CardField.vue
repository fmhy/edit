<script setup lang="ts">
// Define a prop named 'icon' of type string
defineProps<{
  icon: string
}>()
</script>

<template>
  <!-- Template section for the component's layout -->
  <div class="flex items-center mb-[8px] g-[12px]">
    <!-- Flex container for the icon and the slot content -->
    <span class="flex items-center">
      <!-- Container for the icon with a specific size and class based on the 'icon' prop -->
      <div class="text-2xl" :class="icon" />
      <!-- Slot for the component's content with a class for text styling -->
      <div class="ml-2 text-sm text-[var(--vp-c-text-2)]">
        <slot /> <!-- The content provided when using the component -->
      </div>
    </span>
  </div>
</template>

